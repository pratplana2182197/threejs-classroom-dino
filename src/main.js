import * as THREE from 'three';
import './style.css';
import { FirstPersonControls } from './controls/FirstPersonControls.js';
import { loadClassroom } from './scenes/Classroom.js';
import { DinoGameState } from './game/DinoGameState.js';
import { DinoRoom } from './scenes/DinoRoom.js';
import { PortalRenderer2D } from './render/PortalRenderer2D.js';
import { getLocalUVOnMesh, mapUVToMesh, startTeleportTransition, 
  updateTransitionOverlay, getClosestScreen, clampCameraToBounds, updateTeleportPrompt } from './utils/utils.js';

let scene, camera, renderer, controls, gameState, dinoRoom, portalRendererDino, portalRendererClassroom
, origin, destination, screenMeshes, isTeleporting = false, dinoWindow = null;
;


let currentRoom = "classroom";

const CLASSROOM_BOUNDS = {
  minX: -7.2,
  maxX: 7.2,
  minY: 0.8,
  maxY: 3.8,
  minZ: -7.2,
  maxZ: 7.2,
};

const DINOROOM_BOUNDS = {
  minX: 24.5,
  maxX: 35.5,
  minY: 0.9,
  maxY: 10.8,
  minZ: -9.8,
  maxZ: 9.8,
};







const clock = new THREE.Clock();

init().then(animate);

async function init() {
  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(2, 2, 5);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Controls
  controls = new FirstPersonControls(camera, document.body);
  controls.enable(scene);

  // Game state and Dino room
  gameState = new DinoGameState();
  dinoRoom = new DinoRoom(gameState);

  // === FIXED SIDE-VIEW CAMERA FOR DINOROOM ===
const roomWidth = 12;
const roomHeight = 11;
const roomDepth = 20;
const aspect = 512 / 384;

let left, right, top, bottom;
const gameAreaDepth = roomDepth * 0.9;
const gameAreaHeight = roomHeight * 0.8;

if (aspect > gameAreaDepth / gameAreaHeight) {
  const hh = gameAreaHeight / 2;
  top = hh;
  bottom = -hh;
  const hw = hh * aspect;
  left = -hw;
  right = hw;
} else {
  const hw = gameAreaDepth / 2;
  left = -hw;
  right = hw;
  const hh = hw / aspect;
  top = hh;
  bottom = -hh;
}

const dinoCamera = new THREE.OrthographicCamera(left, right, top, bottom, 10, 100);
dinoCamera.position.set(30 - roomWidth / 2 - 5, roomHeight / 2 - 1, 0);
dinoCamera.lookAt(30, roomHeight / 2 - 1, 0);
dinoCamera.up.set(0, 1, 0);

// === PORTAL RENDERERS ===
portalRendererDino = new PortalRenderer2D();
portalRendererDino.setScene(scene);       // full scene is okay since frustum + position isolate dino
portalRendererDino.setCamera(dinoCamera);

portalRendererClassroom = new PortalRenderer2D(); // will be configured at teleport time

  // Load assets before rendering texture
  await dinoRoom._loadAssets();




  portalRendererDino.render(renderer);
  screenMeshes = await loadClassroom(scene, gameState, portalRendererDino.getTexture());
  // Add DinoRoom to the scene
  scene.add(dinoRoom.mesh);
  dinoWindow = dinoRoom.mesh.getObjectByName('DinoWindow');


  // Key events
let lastTeleportOrigin = null;

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    if (gameState.gameOver) {
      gameState.reset();
    } else {
      gameState.jump();
    }
  }

  if (e.code === 'ArrowDown' && !gameState.gameOver) {
    gameState.dino.ducking = true;
  }

  if (e.code === 'KeyE') {
    const prompt = document.getElementById('teleportPrompt');
    if (prompt.style.display !== 'block') return; 
    const cameraPos = controls.controls.object.position;
    const closestScreen = getClosestScreen(camera, screenMeshes);

    const fromClassroom = currentRoom === "classroom";

    origin = fromClassroom ? closestScreen : dinoWindow;
    destination = fromClassroom ? dinoWindow : lastTeleportOrigin || closestScreen;

    if (!origin || !destination) {
      console.warn("Teleport aborted: missing origin or destination.");
      return;
    }

    // Remember last origin if entering DinoRoom
    if (fromClassroom) lastTeleportOrigin = origin;

    const offset = (destination === dinoWindow) ? -0.2 : 0.2;
    const { u, v } = getLocalUVOnMesh(origin, cameraPos);
    const newWorldPos = mapUVToMesh(destination, u, v, offset);

    if (fromClassroom) {
      // === Build correctly oriented camera ===


const viewCam = new THREE.PerspectiveCamera(50, 512 / 384, 0.1, 100);

// Position: above the screen we're coming from
const originWorldPos = origin.getWorldPosition(new THREE.Vector3());
viewCam.position.copy(originWorldPos.clone().add(new THREE.Vector3(0, 0.6, 0)));

// Look toward the **back wall**, at fixed point in space (low X)
viewCam.lookAt(new THREE.Vector3(-7.5, 1.2, 0)); // X = -7.5 if roomWidth = 15

      // === Prevent feedback loop ===
      const originalMap = origin.material.map;
      origin.material.map = null;
      origin.material.needsUpdate = true;

      portalRendererClassroom.setScene(scene);
      portalRendererClassroom.setCamera(viewCam);
      portalRendererClassroom.render(renderer);

      origin.material.map = originalMap;
      origin.material.needsUpdate = true;

      const dinoWindow = dinoRoom.mesh.getObjectByName("DinoWindow");
      dinoWindow.material.map = portalRendererClassroom.getTexture();
      dinoWindow.material.needsUpdate = true;
    }

    startTeleportTransition(controls, newWorldPos, 1.5);
    isTeleporting = true;
    currentRoom = fromClassroom ? "dinoRoom" : "classroom";
  }
});


  document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') {
      gameState.dino.ducking = false;
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  controls.update();
  gameState.update(delta);
  dinoRoom.update();

  const camPos = controls.controls.object.position;
// console.log(`Camera position: x=${camPos.x.toFixed(2)}, y=${camPos.y.toFixed(2)}, z=${camPos.z.toFixed(2)}`);

  updateTeleportPrompt(camera, screenMeshes, currentRoom, dinoWindow);
  portalRendererDino.render(renderer);
// portalRendererClassroom.render(renderer); // safe: only renders if scene + camera set
  if (!isTeleporting) {
  clampCameraToBounds(camera, currentRoom === 'classroom' ? CLASSROOM_BOUNDS : DINOROOM_BOUNDS);
}
  // Main render pass
  renderer.render(scene, camera);

  updateTransitionOverlay(delta, renderer, scene, camera, () => {
  isTeleporting = false;
});
}
