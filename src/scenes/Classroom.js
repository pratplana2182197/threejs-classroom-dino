import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadLaptopInstance } from './Laptop.js';
import { loadWhiteboard } from './Whiteboard.js';

export async function loadClassroom(scene, gameState, sharedTexture) {
  const screenRefs = [];

  const classroomGroup = new THREE.Group();
  scene.add(classroomGroup);

  const loader = new GLTFLoader();
  const modelPath = '/models/classroom_desk.glb';
  const roomWidth = 15;
  const roomDepth = 15;
  const roomHeight = 4;

  // === Floor ===
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  classroomGroup.add(floor);

  // === Walls ===
  const textureLoader = new THREE.TextureLoader();
  const brickTexture = textureLoader.load('/textures/yellow_brick.jpg');
  brickTexture.wrapS = brickTexture.wrapT = THREE.RepeatWrapping;
  brickTexture.repeat.set(4, 2);
  const wallMaterial = new THREE.MeshStandardMaterial({ map: brickTexture });

  const wallThickness = 0.1;
  const walls = [
    { size: [roomWidth, roomHeight, wallThickness], pos: [0, roomHeight / 2, -roomDepth / 2] },
    { size: [roomWidth, roomHeight, wallThickness], pos: [0, roomHeight / 2, roomDepth / 2] },
    { size: [wallThickness, roomHeight, roomDepth], pos: [-roomWidth / 2, roomHeight / 2, 0] },
    { size: [wallThickness, roomHeight, roomDepth], pos: [roomWidth / 2, roomHeight / 2, 0] },
  ];

  for (const { size, pos } of walls) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMaterial);
    mesh.position.set(...pos);
    classroomGroup.add(mesh);
  }

  // === Lighting ===
  const light = new THREE.PointLight(0xffffff, 1.5, 30);
  light.position.set(0, roomHeight - 0.1, 0);
  light.castShadow = true;
  classroomGroup.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0xffffaa })
  );
  bulb.position.copy(light.position);
  classroomGroup.add(bulb);

  // === Load desks ===
  const deskScene = await new Promise((resolve, reject) => {
    loader.load(modelPath, gltf => resolve(gltf.scene), undefined, reject);
  });

  const box = new THREE.Box3().setFromObject(deskScene);
  const minY = box.min.y;

  const rows = 3;
  const cols = 4;
  const spacing = 2.5;
  const xOffset = -((cols - 1) * spacing) / 2;
  const zOffset = -((rows - 1) * spacing) / 2;

  const laptopPromises = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const clone = deskScene.clone(true);
      clone.position.set(j * spacing + xOffset, -minY, i * spacing + zOffset);

      clone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      classroomGroup.add(clone);

      const deskBox = new THREE.Box3().setFromObject(clone);
      const deskTopY = deskBox.max.y - clone.position.y;

      // Load laptop and track its screen
      const laptopPromise = loadLaptopInstance(sharedTexture).then((laptop) => {
      laptop.position.y = deskTopY;
      clone.add(laptop);
      if (laptop.screen) screenRefs.push(laptop.screen); // ✅ access from wrapper
    });

      laptopPromises.push(laptopPromise);
    }
  }

  // Wait for all laptops
  await Promise.all(laptopPromises);

  // === Load whiteboard and add its screen ===
  const whiteboard = loadWhiteboard(scene, roomWidth, sharedTexture);
  if (whiteboard?.screen) screenRefs.push(whiteboard.screen);

  return screenRefs;
}
