import * as THREE from 'three';
import './style.css';
import { FirstPersonControls } from './controls/FirstPersonControls.js';
import { loadClassroom } from './scenes/Classroom.js';
import { DinoGameState } from './game/DinoGameState.js';
import { DinoRoom } from './scenes/DinoRoom.js';
import { PortalRenderer2D } from './render/PortalRenderer2D.js';
import { getLocalUVOnMesh, mapUVToMesh, startTeleportTransition, updateTransitionOverlay, getClosestScreen } from './utils/utils.js';

let scene, camera, renderer, controls, gameState, dinoRoom, portalRendererDino, portalRendererClassroom
, origin, destination, screenMeshes;
let currentRoom = "classroom";
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

  // Key events
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
      const cameraPos = controls.controls.object.position;
      const closestScreen = getClosestScreen(camera, screenMeshes);

      const whiteboard = scene.getObjectByName('Whiteboard');
      const dinoWindow = dinoRoom.mesh.getObjectByName('DinoWindow');

      const fromClassroom = currentRoom === "classroom";
      // origin = fromClassroom ? whiteboard : dinoWindow;
      // destination = fromClassroom ? dinoWindow : whiteboard;
      origin = fromClassroom ? closestScreen : dinoWindow;
      destination = fromClassroom ? dinoWindow : closestScreen;

      const offset = (destination === dinoWindow) ? -0.2 : 0.2;
      const { u, v } = getLocalUVOnMesh(origin, cameraPos);
      const newWorldPos = mapUVToMesh(destination, u, v, offset);



      if (fromClassroom) {
        const viewCam = new THREE.PerspectiveCamera(50, 512 / 384, 0.1, 100);
        viewCam.position.copy(origin.getWorldPosition(new THREE.Vector3()));
        viewCam.position.add(new THREE.Vector3(0, 0.8, 0.2));
        viewCam.lookAt(new THREE.Vector3(0, 1, 0));

        portalRendererClassroom.setScene(scene);
        portalRendererClassroom.setCamera(viewCam);
        portalRendererClassroom.render(renderer);  // ✅ this was missing!

        dinoWindow.material.map = portalRendererClassroom.getTexture();
        dinoWindow.material.needsUpdate = true;

}

    // Optional: store it somewhere to skip redundant rebuilds
    // dinoRoom.mesh.getObjectByName('DinoWindow').material.map = portalRendererClassroom.getTexture();

    startTeleportTransition(controls, newWorldPos, 1.5);
    currentRoom = (currentRoom === "classroom") ? "dinoRoom" : "classroom";
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

  portalRendererDino.render(renderer);
// portalRendererClassroom.render(renderer); // safe: only renders if scene + camera set

  // Main render pass
  renderer.render(scene, camera);

  updateTransitionOverlay(delta, renderer, scene, camera);
}
