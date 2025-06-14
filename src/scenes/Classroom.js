import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

import { loadLaptopInstance } from './Laptop.js';
import { loadWhiteboard } from './Whiteboard.js';

export async function loadClassroom(scene, gameState, sharedTexture) {
  const screenRefs = [];
  const classroomGroup = new THREE.Group();
  scene.add(classroomGroup);

  const loader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();

  const modelPath = '/models/classroom_desk.glb';
  const roomDepth = 15;     // Z axis: left to right
  const roomWidth = 13;     // X axis: front to back
  const roomHeight = 6;
  const wallThickness = 0.1;

  // === Floor ===
  const floorTexture = textureLoader.load('/textures/floor_texture.jpg');
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(4, 2);
  const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture, transparent: false });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomDepth+2, roomWidth+2),
    floorMaterial
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  classroomGroup.add(floor);

  // === Walls ===
  const brickTexture = textureLoader.load('/textures/yellow_brick.jpg');
  brickTexture.wrapS = brickTexture.wrapT = THREE.RepeatWrapping;
  brickTexture.repeat.set(4, 2);
  const wallMaterial = new THREE.MeshStandardMaterial({ map: brickTexture });

  const objLoader = new OBJLoader();
  objLoader.load('/models/classroom_walls.obj', (walls) => {
    walls.rotation.x = -Math.PI / 2;
    walls.rotation.z = -Math.PI / 2;
    walls.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: brickTexture,
          transparent: false,
          metalness: 0,
          roughness: 1,
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    classroomGroup.add(walls);
  });

  // === Door ===
  objLoader.load('/models/door.obj', (door) => {
    door.scale.set(2, 2, 2);
    door.position.set(
      5.95,
      -0.1,
      -roomWidth / 2 - 0.35
    );

    door.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    classroomGroup.add(door);
  });

  // // === Door Shadow Blocker (Fixed) ===
  // const shadowBlocker = new THREE.Mesh(
  //   new THREE.BoxGeometry(1.2, 2.5, 0.3),
  //   new THREE.MeshStandardMaterial({ 
  //     color: 0x000000, 
  //     transparent: true,
  //     opacity: 0
  //   })
  // );
  // shadowBlocker.position.set(
  //   5.95,
  //   1.25,
  //   -roomWidth / 2 - 0.2
  // );
  // shadowBlocker.castShadow = true;
  // shadowBlocker.receiveShadow = false;
  // classroomGroup.add(shadowBlocker);

  // // === Ceiling Edge Blockers (Prevent Light Leaks) ===
  // const ceilingBlockers = [
  //   // Top blockers above walls to prevent light leaks
  //   { size: [roomDepth + 2, 1, 0.3], pos: [0, roomHeight + 0.7, -roomWidth / 2 - 0.15] }, // Back wall top
  //   { size: [roomDepth + 2, 1, 0.3], pos: [0, roomHeight + 0.7, roomWidth / 2 + 0.15] },  // Front wall top
  //   { size: [0.3, 1, roomWidth + 2], pos: [-roomDepth / 2 - 0.15, roomHeight + 0.7, 0] }, // Left wall top
  //   { size: [0.3, 1, roomWidth + 2], pos: [roomDepth / 2 + 0.15, roomHeight + 0.7, 0] }   // Right wall top
  // ];

  // ceilingBlockers.forEach(({ size, pos }) => {
  //   const blocker = new THREE.Mesh(
  //     new THREE.BoxGeometry(...size),
  //     new THREE.MeshStandardMaterial({ 
  //       transparent: true, 
  //       opacity: 0,
  //       color: 0x000000 
  //     })
  //   );
  //   blocker.position.set(...pos);
  //   blocker.castShadow = true;
  //   blocker.receiveShadow = false;
  //   classroomGroup.add(blocker);
  // });

  // === Blinds ===
  loader.load('/models/blinds.glb', (gltf) => {
    const spacing = 3;
    const blindWidth = 1.98;
    const blindHeight = 2.08;
    const firstX = -roomDepth / 2 + 1;
    const blindZ = -roomWidth / 2 + 3;
    const blindY = 2;

    for (let i = 0; i < 3; i++) {
      const x = firstX + i * spacing;

      const blinds = gltf.scene.clone(true);

      const box = new THREE.Box3().setFromObject(blinds);
      const center = new THREE.Vector3();
      box.getCenter(center);
      blinds.position.sub(center);

      const scale = 0.01;
      blinds.scale.setScalar(scale);
      blinds.position.set(x, blindY, blindZ);
      blinds.rotation.y = -Math.PI / 2;

      blinds.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      classroomGroup.add(blinds);
    }
  });

  // === Windows ===
  const frostedGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.5,
    transmission: 1.0,
    thickness: 0.1,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    reflectivity: 0.4,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });

  const windowWidth = 1.98;
  const windowHeight = 2.08;
  const windowsSpacing = 3;
  const firstX = -roomDepth / 2 + 3;  
  const windowZ = -roomWidth / 2 - 0.1;
  const windowY = 3.55; 

  for (let i = 0; i < 3; i++) {
    const x = firstX + i * windowsSpacing;
    const windowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      frostedGlassMaterial
    );
    windowMesh.position.set(x, windowY, windowZ);
    classroomGroup.add(windowMesh);
  }

  // === Ceiling with Light Panels (Keep your original settings) ===
  const ceilingTex = textureLoader.load('/textures/office_ceiling2.jpg');
  ceilingTex.wrapS = ceilingTex.wrapT = THREE.RepeatWrapping;
  ceilingTex.repeat.set(2, 2);
  const ceilingMaterial = new THREE.MeshStandardMaterial({ 
    map: ceilingTex,
    color: 0xffffff,
    transparent: false,
    metalness: 0,
    roughness: 1 
  });

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(roomDepth + 1, 0.3, roomWidth + 1),
    ceilingMaterial
  );
  ceiling.position.y = roomHeight + 0.15;
  ceiling.receiveShadow = true;
  ceiling.castShadow = true;
  classroomGroup.add(ceiling);

  // === Light Panels & Lights (Keep your original settings) ===
  const ceilingLights = [];

  const gridZ = 8;
  const gridX = 8;

  const tileSizeZ = roomDepth / gridZ;
  const tileSizeX = roomWidth / gridX;

  const lightPanelMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    emissive: 0xf5f5dc,
    emissiveIntensity: 0.8
  });

  const lightPositions = [
    [2, 2], [4, 2], [6, 2],
    [2, 5], [4, 5], [6, 5]
  ];

  lightPositions.forEach(([zIndex, xIndex]) => {
    const z = -roomDepth / 2 + (zIndex + 0.5) * tileSizeZ;
    const x = -roomWidth / 2 + (xIndex + 0.5) * tileSizeX;

    const lightPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(tileSizeZ, tileSizeX),
      lightPanelMaterial
    );
    lightPanel.rotation.x = Math.PI / 2;
    lightPanel.position.set(z, roomHeight - 0.01, x);
    classroomGroup.add(lightPanel);

    const panelLight = new THREE.PointLight(0xffffff, 12, 0);
    panelLight.position.set(z, roomHeight - 0.05, x);
    panelLight.castShadow = true;
    panelLight.shadow.mapSize.set(512, 512);
    panelLight.shadow.camera.near = 0.1;
    panelLight.shadow.camera.far = 12;
    classroomGroup.add(panelLight);
    ceilingLights.push(panelLight);
  });

  // === Sunlight (Fixed Shadow Camera) ===
  const sunlight = new THREE.DirectionalLight(0xffffff, 4.5);
  sunlight.castShadow = true;
  sunlight.position.set(-10, 25, -40);
  sunlight.target.position.set(0, 3, 0);
  scene.add(sunlight);
  scene.add(sunlight.target);

  // Fixed shadow camera settings
  const halfDepth = roomDepth / 2;
  const halfWidth = roomWidth / 2;

  sunlight.shadow.camera.left = -halfDepth - 2;
  sunlight.shadow.camera.right = halfDepth + 2;
  sunlight.shadow.camera.top = halfWidth + 2;
  sunlight.shadow.camera.bottom = -halfWidth - 2;

  sunlight.shadow.camera.near = 10;
  sunlight.shadow.camera.far = 100;
  sunlight.shadow.bias = -0.0001;
  sunlight.shadow.mapSize.set(2048, 2048);

  // Shadow camera helper (optional - remove in production)
  const shadowHelper = new THREE.CameraHelper(sunlight.shadow.camera);
  // scene.add(shadowHelper);

  // Sun visualization
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 32, 32),
    new THREE.MeshStandardMaterial({ 
      emissive: 0xffdd88,
      emissiveIntensity: 10,
      color: 0x000000 
    })
  );
  sunMesh.position.copy(sunlight.position);
  scene.add(sunMesh);

  // === Load Desks ===
  const deskScene = await new Promise((resolve, reject) => {
    loader.load(modelPath, gltf => resolve(gltf.scene), undefined, reject);
  });
  const deskBox = new THREE.Box3().setFromObject(deskScene);
  const minY = deskBox.min.y;

  const rows = 3;
  const cols = 4;
  const spacing = 2.5;
  const xOffset = -((cols - 1) * spacing) / 2;
  const zOffset = -((rows - 1) * spacing) / 2;

  const laptopPromises = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const deskClone = deskScene.clone(true);
      deskClone.position.set(j * spacing + xOffset, -minY, i * spacing + zOffset);

      deskClone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      classroomGroup.add(deskClone);

      const deskBox = new THREE.Box3().setFromObject(deskClone);
      const deskTopY = deskBox.max.y - deskClone.position.y;

      const laptopPromise = loadLaptopInstance(sharedTexture).then((laptop) => {
        laptop.position.y = deskTopY;
        laptop.castShadow = true;
        laptop.receiveShadow = true;
        deskClone.add(laptop);

        if (laptop.screen) screenRefs.push(laptop.screen);
      });

      laptopPromises.push(laptopPromise);
    }
  }

  await Promise.all(laptopPromises);

  // === Whiteboard ===
  const whiteboard = loadWhiteboard(scene, roomDepth, sharedTexture);
  if (whiteboard?.screen) screenRefs.push(whiteboard.screen);

  return {
    screenRefs,
    sunlight,
    ceilingLights,
    sunMesh
  };
}