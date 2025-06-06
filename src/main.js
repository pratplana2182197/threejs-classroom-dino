import * as THREE from 'three';
import './style.css';
import { loadClassroom } from './scenes/Classroom.js';
import { FirstPersonControls } from './controls/FirstPersonControls.js';

let scene, camera, renderer, controls;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5); // Sky blue
  // Coordinate axes helper: red = X, green = Y, blue = Z
const axesHelper = new THREE.AxesHelper(5); // 5 units long
scene.add(axesHelper);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(10, 8, 10);
  camera.lookAt(0, 1, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Classroom setup
  loadClassroom(scene);

  controls = new FirstPersonControls(camera, document.body);
  controls.enable(scene);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
