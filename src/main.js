import * as THREE from 'three';
import './style.css';
import { FirstPersonControls } from './controls/FirstPersonControls.js';
import { loadClassroom } from './scenes/Classroom.js';
import { DinoGameState } from './game/DinoGameState.js';
import { DinoRoom } from './scenes/DinoRoom.js';
import { DinoRoomRenderer2D } from './render/DinoRoomRenderer2D.js';
import { getLocalUVOnMesh, mapUVToMesh, startTeleportTransition, updateTransitionOverlay} from './utils/utils.js';
let scene, camera, renderer, controls, gameState, dinoRoom, renderer2D;

const clock = new THREE.Clock();
init().then(animate);

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(2, 2, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document.body.appendChild(renderer.domElement);

  controls = new FirstPersonControls(camera, document.body);
  controls.enable(scene);

  gameState = new DinoGameState();
  dinoRoom = new DinoRoom(gameState);
  renderer2D = new DinoRoomRenderer2D(renderer, dinoRoom);
  scene.userData.dino2DRenderers = [renderer2D];

  // Wait for DinoRoom to load assets before rendering 2D texture
  await dinoRoom._loadAssets();

  // Now render the 2D room and apply its texture to screens
  renderer2D.render();
  loadClassroom(scene, gameState, renderer2D.getTexture());

  scene.add(dinoRoom.mesh);

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {

      if (gameState.gameOver) {
        gameState.reset();
      } else if (!gameState.gameOver) {
        gameState.jump();
      }
    }
    if (e.code === 'ArrowDown' && !gameState.gameOver) {
      gameState.dino.ducking = true;
    }
    if (e.code === 'KeyE') {
      const cameraPos = controls.controls.object.position;
      const whiteboard = scene.getObjectByName('Whiteboard');
      const dinoWindow = dinoRoom.mesh.getObjectByName('DinoWindow');

      const { u, v } = getLocalUVOnMesh(whiteboard, cameraPos);
      const newWorldPos = mapUVToMesh(dinoWindow, u, v);
      startTeleportTransition(controls, newWorldPos, 1.5); // 1.5 seconds = 0.75 in + 0.75 out

      // controls.controls.getObject().position.copy(newWorldPos);
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

  // Render offscreen 2D view for screens
  scene.userData.dino2DRenderers?.forEach(r => r.render(delta));
  // scene.userData.canvasRenderers?.forEach(r => r.render(renderer, delta));
  // scene.userData.debugRenderer?.render();

  renderer.render(scene, camera);
  updateTransitionOverlay(delta, renderer, scene, camera);
}
