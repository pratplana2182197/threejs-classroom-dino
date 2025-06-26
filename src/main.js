import * as THREE from 'three';
import './style.css';

import Stats from 'three/examples/jsm/libs/stats.module.js';
import { FirstPersonControls } from './controls/FirstPersonControls.js';
import { loadClassroom } from './scenes/Classroom.js';
import { DinoGameState } from './game/DinoGameState.js';
import { DinoRoom } from './scenes/DinoRoom.js';
import { PortalRenderer2D } from './render/PortalRenderer2D.js';

import {
  getLocalUVOnMesh,
  mapUVToMesh,
  startTeleportTransition,
  updateTransitionOverlay,
  getClosestScreen,
  clampCameraToBounds,
  updateTeleportPrompt
} from './utils/utils.js';

let classroomScene, dinoScene, camera, renderer, controls;
let portalRendererDino, portalRendererClassroom;
let gameState, dinoRoom, dinoCanvas, screenMeshes;
let currentRoom = 'classroom';
let fromClassroom, origin, destination, isTeleporting = false;
let lightsOn = true;
let stats, dinoCamPos, dinoCamTargetPos;

const CLASSROOM_BOUNDS = { minX: -7.2, maxX: 7.2, minY: 0.8, maxY: 5.8, minZ: -6.2, maxZ: 6.2 };
const DINOROOM_BOUNDS = { minX: -5.5, maxX: 5.5, minY: 0.9, maxY: 10.8, minZ: -9.5, maxZ: 9.5 };

const clock = new THREE.Clock();

init().then(animate);

async function init() {
  // Scenes
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

  stats = new Stats();
  document.getElementById('stats-box').appendChild(stats.dom);

  controls = new FirstPersonControls(camera, document.body);
  controls.enable(classroomScene);

  // Game
  gameState = new DinoGameState();
  dinoRoom = new DinoRoom(gameState);
  dinoScene.add(dinoRoom.mesh);

  // Dino camera
  const roomWidth = 12, roomHeight = 11, roomDepth = 20;
  const aspect = 512 / 384;
  const gameDepth = roomDepth * 0.9;
  const gameHeight = roomHeight * 0.8;

  const hh = aspect > gameDepth / gameHeight ? gameHeight / 2 : gameDepth / 2 / aspect;
  const hw = aspect > gameDepth / gameHeight ? hh * aspect : gameDepth / 2;

  const dinoCamera = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 10, 100);
  dinoCamera.position.set(-roomWidth / 2 - 5, roomHeight / 2 - 1, 0);
  dinoCamera.lookAt(0, roomHeight / 2 - 1, 0);
  dinoCamera.up.set(0, 1, 0);

  // Portals
  portalRendererDino = new PortalRenderer2D();
  portalRendererDino.setScene(dinoScene);
  portalRendererDino.setCamera(dinoCamera);

  portalRendererClassroom = new PortalRenderer2D();

  await dinoRoom._loadAssets();
  portalRendererDino.render(renderer);

  const {
    screenRefs, sunlight, sunMesh, ceilingLights,
    lightPanelMaterials, windowMeshes
  } = await loadClassroom(classroomScene, gameState, portalRendererDino.getTexture());

  screenMeshes = screenRefs;
  dinoCanvas = dinoRoom.mesh.getObjectByName('dinoCanvas');

  // Key events
  let lastTeleportOrigin = null;

  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (['space', 'arrowup'].includes(e.code)) {
      gameState.gameOver && gameState.restartCooldown <= 0
        ? gameState.reset()
        : gameState.jump();
    }

    if (e.code === 'arrowdown' && !gameState.gameOver) {
      gameState.dino.ducking = true;
    }

    if (key === 'n') {
      sunlight.visible = !sunlight.visible;
      sunMesh.visible = !sunMesh.visible;

      windowMeshes.forEach(mesh => {
        const mat = mesh.material;
        if (!mat) return;
        mat.transparent = sunlight.visible;
        mat.opacity = sunlight.visible ? 0.95 : 1;
        mat.color.set(sunlight.visible ? 0xffffff : 0xaaaaaa);
        mat.roughness = sunlight.visible ? 0.5 : 1;
        mat.metalness = 0;
      });

      if (currentRoom === 'dinoRoom') {
        portalRendererClassroom.render(renderer);
      }
    }

    if (key === 'l') {
      lightsOn = !lightsOn;
      ceilingLights.forEach(l => l.visible = lightsOn);
      lightPanelMaterials.forEach(m => m.emissiveIntensity = lightsOn ? 0.8 : 0.01);

      if (currentRoom === 'dinoRoom') {
        portalRendererClassroom.render(renderer);
      }
    }

    if (e.code === 'KeyE') {
      const prompt = document.getElementById('teleportPrompt');
      if (prompt.style.display !== 'block') return;

      const camPos = controls.controls.object.position;
      const closestScreen = getClosestScreen(camera, screenMeshes);

      fromClassroom = currentRoom === 'classroom';
      origin = fromClassroom ? closestScreen : dinoCanvas;
      destination = fromClassroom ? dinoCanvas : lastTeleportOrigin || closestScreen;

      if (!origin || !destination) return;

      const offset = destination === dinoCanvas ? -0.2 : 0.2;
      const { u, v } = getLocalUVOnMesh(origin, camPos);
      const newWorldPos = mapUVToMesh(destination, u, v, offset);

      if (fromClassroom) {
        lastTeleportOrigin = origin;

        const viewCam = new THREE.PerspectiveCamera(50, 512 / 384, 0.1, 100);
        viewCam.position.copy(origin.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.6, 0)));
        viewCam.lookAt(new THREE.Vector3(-7.5, 1.2, 0));

        const originalMap = origin.material.map;
        origin.material.map = null;
        origin.material.needsUpdate = true;

        portalRendererClassroom.setScene(classroomScene);
        portalRendererClassroom.setCamera(viewCam);
        portalRendererClassroom.render(renderer);

        origin.material.map = originalMap;
        origin.material.needsUpdate = true;

        dinoCanvas.material.map = portalRendererClassroom.getTexture();
        dinoCanvas.material.needsUpdate = true;
      }

      startTeleportTransition(controls, newWorldPos, 1.5);
      isTeleporting = true;
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
  stats.begin();
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  controls.update();
  gameState.update(delta);
  dinoRoom.update();

  updateTeleportPrompt(camera, screenMeshes, currentRoom, dinoCanvas);
  portalRendererDino.render(renderer);

  if (!isTeleporting) {
    clampCameraToBounds(camera, currentRoom === 'classroom' ? CLASSROOM_BOUNDS : DINOROOM_BOUNDS);
  }

  const activeScene = currentRoom === 'classroom' ? classroomScene : dinoScene;
  gameState.renderCollisionBoxes(dinoScene, THREE);
  renderer.render(activeScene, camera);

  updateTransitionOverlay(delta, renderer, activeScene, camera, () => {
    isTeleporting = false;
    currentRoom = fromClassroom ? 'dinoRoom' : 'classroom';

    controls.enable(currentRoom === 'classroom' ? classroomScene : dinoScene);

    if (currentRoom === 'classroom') {
      dinoCamPos = new THREE.Vector3(dinoRoom.roomWidth / 2 + 4, dinoRoom.roomHeight / 2, 0);
      dinoCamTargetPos = new THREE.Vector3(dinoRoom.roomWidth + 10, dinoRoom.roomHeight / 2, 0);
      dinoRoom.backWall.material.roughness = 0.2;
    } else {
      dinoCamPos = new THREE.Vector3(-dinoRoom.roomWidth / 2, dinoRoom.roomHeight - 2, 0);
      dinoCamTargetPos = new THREE.Vector3(0, dinoRoom.roomHeight / 2, 0);
      dinoRoom.backWall.material.roughness = 1;
    }

    dinoRoom.dirLight.position.copy(dinoCamPos);
    dinoRoom.dirLight.target.position.copy(dinoCamTargetPos);
  });

  stats.end();
}
