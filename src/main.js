import * as THREE from 'three';
import './style.css';
import { FirstPersonControls } from './controls/FirstPersonControls.js';
import { loadClassroom } from './scenes/Classroom.js';
import { DinoGameState } from './game/DinoGameState.js';
import { DinoRoom } from './scenes/DinoRoom.js';

let scene, camera, renderer, controls, gameState, dinoRoom;

const clock = new THREE.Clock();
init();
animate();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(2, 2, 5);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Controls
  controls = new FirstPersonControls(camera, document.body);
  controls.enable(scene);

  // Shared game state
  gameState = new DinoGameState();

  // Load classroom with shared game state
  loadClassroom(scene, gameState);

  dinoRoom = new DinoRoom(gameState);
  scene.add(dinoRoom.mesh);

  document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    const canvasRenderers = scene.userData.canvasRenderers || [];
    const anyAllowRestart = canvasRenderers.some(r => r.allowRestart);

    if (gameState.gameOver && anyAllowRestart) {
      gameState.reset();
      canvasRenderers.forEach(r => r.reset()); // ✅ reset each renderer
    } else if (!gameState.gameOver) {
      gameState.jump();
    }
  }

  if (e.code === 'ArrowDown') {
    if (!gameState.gameOver) {
      gameState.dino.ducking = true;
    }
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') {
    gameState.dino.ducking = false;
  }
});


  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  controls.update(); // ✅ camera controls

  gameState.update(delta); // ✅ this now uses a fixed timestep internally
   dinoRoom.update();
  scene.userData.canvasRenderers?.forEach(r => {
    r.render(renderer, delta); // 🟢 only handles drawing now
  });

  renderer.render(scene, camera);
}

