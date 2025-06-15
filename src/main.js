import * as THREE from 'three';
import './style.css';
import { FirstPersonControls } from './controls/FirstPersonControls.js';
import { loadClassroom } from './scenes/Classroom.js';
import { DinoGameState } from './game/DinoGameState.js';
import { DinoRoom } from './scenes/DinoRoom.js';
import { PortalRenderer2D } from './render/PortalRenderer2D.js';
import { getLocalUVOnMesh, mapUVToMesh, startTeleportTransition, 
  updateTransitionOverlay, getClosestScreen, clampCameraToBounds, updateTeleportPrompt } from './utils/utils.js';

// Dual scene setup
let classroomScene, dinoScene, camera, renderer, controls, gameState, dinoRoom;
let portalRendererDino, portalRendererClassroom;
let origin, destination, screenMeshes, isTeleporting = false, dinoWindow = null;
let currentRoom = "classroom";
let fromClassroom;

const CLASSROOM_BOUNDS = {
  minX: -7.2,
  maxX: 7.2,
  minY: 0.8,
  maxY: 5.8,
  minZ: -6.2,
  maxZ: 6.2,
};

const DINOROOM_BOUNDS = {
  minX: -5.5,
  maxX: 5.5,
  minY: 0.9,
  maxY: 10.8,
  minZ: -9.8,
  maxZ: 9.8,
};

const clock = new THREE.Clock();

init().then(animate);

async function init() {
  // === DUAL SCENE SETUP ===
  classroomScene = new THREE.Scene();
  classroomScene.background = new THREE.Color(0xbfd1e5);
  
  dinoScene = new THREE.Scene();
  dinoScene.background = new THREE.Color(0xf0f0f0);

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
  controls.enable(classroomScene);

  // Game state
  gameState = new DinoGameState();

  // === DINO ROOM SETUP (Separate Scene) ===
  dinoRoom = new DinoRoom(gameState);
  // Position the dino room at origin in its own scene
  dinoRoom.mesh.position.set(0, 0, 0);
  dinoScene.add(dinoRoom.mesh);

  // === DINO CAMERA SETUP ===
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
  dinoCamera.position.set(-roomWidth / 2 - 5, roomHeight / 2 - 1, 0);
  dinoCamera.lookAt(0, roomHeight / 2 - 1, 0);
  dinoCamera.up.set(0, 1, 0);

  // === PORTAL RENDERERS ===
  portalRendererDino = new PortalRenderer2D();
  portalRendererDino.setScene(dinoScene);
  portalRendererDino.setCamera(dinoCamera);

  portalRendererClassroom = new PortalRenderer2D();

  // Load dino room assets first
  await dinoRoom._loadAssets();

  // Render dino scene to texture
  portalRendererDino.render(renderer);

  // Load classroom with dino texture
  const result = await loadClassroom(classroomScene, gameState, portalRendererDino.getTexture());
  screenMeshes = result.screenRefs;
  const sunlight = result.sunlight;
  const sunMesh = result.sunMesh;
  const ceilingLights = result.ceilingLights;

  // Get reference to dino window for teleportation
  dinoWindow = dinoRoom.mesh.getObjectByName('DinoWindow');

  // === KEY EVENTS ===
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

    if (e.key === 'n' || e.key === 'N') {
      sunlight.visible = !sunlight.visible;
      sunMesh.visible = !sunMesh.visible;
    }

    if (e.key === 'l' || e.key === 'L') {
      ceilingLights.forEach(light => {
        light.visible = !light.visible;
      });
    }

    if (e.code === 'KeyE') {
      const prompt = document.getElementById('teleportPrompt');
      if (prompt.style.display !== 'block') return;
      
      const cameraPos = controls.controls.object.position;
      const closestScreen = getClosestScreen(camera, screenMeshes);
      fromClassroom = currentRoom === "classroom";

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
      let newWorldPos;

      if (fromClassroom) {
        // Going to dino room - map UV to dino room coordinates
        newWorldPos = mapUVToMesh(destination, u, v, offset);
        // Adjust for dino room being at origin in its own scene
        // newWorldPos.add(new THREE.Vector3(30, 0, 0));
      } else {
        // Coming back to classroom
        newWorldPos = mapUVToMesh(destination, u, v, offset);
      }

      // Setup portal rendering based on direction
      if (fromClassroom) {
        // Render classroom view for dino window
        const viewCam = new THREE.PerspectiveCamera(50, 512 / 384, 0.1, 100);
        const originWorldPos = origin.getWorldPosition(new THREE.Vector3());
        viewCam.position.copy(originWorldPos.clone().add(new THREE.Vector3(0, 0.6, 0)));
        viewCam.lookAt(new THREE.Vector3(-7.5, 1.2, 0));

        // Prevent feedback loop
        const originalMap = origin.material.map;
        origin.material.map = null;
        origin.material.needsUpdate = true;

        portalRendererClassroom.setScene(classroomScene);
        portalRendererClassroom.setCamera(viewCam);
        portalRendererClassroom.render(renderer);

        origin.material.map = originalMap;
        origin.material.needsUpdate = true;

        // Update dino window texture
        dinoWindow.material.map = portalRendererClassroom.getTexture();
        dinoWindow.material.needsUpdate = true;
      }

      const targetRoom = fromClassroom ? "dinoRoom" : "classroom";
      startTeleportTransition(controls, newWorldPos, 1.5);
      isTeleporting = true;


      // currentRoom = fromClassroom ? "dinoRoom" : "classroom";
      
      // Switch scene context for controls
      // if (currentRoom === "classroom") {
      //   controls.enable(classroomScene);
      // } else {
      //   controls.enable(dinoScene);
      // }
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

  // Update teleport prompt based on current room
  if (currentRoom === "classroom") {
    updateTeleportPrompt(camera, screenMeshes, currentRoom, dinoWindow);
  } else {
    updateTeleportPrompt(camera, screenMeshes, currentRoom, dinoWindow);
  }

  // Render dino scene to texture for classroom screens
  portalRendererDino.render(renderer);

  // Apply camera bounds based on current room
  if (!isTeleporting) {
  clampCameraToBounds(camera, currentRoom === 'classroom' ? CLASSROOM_BOUNDS : DINOROOM_BOUNDS);
}

  // Main render pass - render the appropriate scene
  const activeScene = currentRoom === "classroom" ? classroomScene : dinoScene;
  renderer.render(activeScene, camera);

  updateTransitionOverlay(delta, renderer, activeScene, camera, () => {
  isTeleporting = false;
  // Move the room switching here - it now happens at peak white
  currentRoom = fromClassroom ? "dinoRoom" : "classroom";
  if (currentRoom === "classroom") {
    controls.enable(classroomScene);
  } else {
    controls.enable(dinoScene);
  }
});
}