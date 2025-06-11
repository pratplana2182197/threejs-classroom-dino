import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadLaptopInstance } from './Laptop.js';
import { loadWhiteboard } from './Whiteboard.js';

export function loadClassroom(scene, gameState, sharedTexture) {
  const classroomGroup = new THREE.Group();
  scene.add(classroomGroup);

  const loader = new GLTFLoader();
  const modelPath = '/models/classroom_desk.glb';
  const roomWidth = 15;
  const roomDepth = 15;
  const roomHeight = 4;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  classroomGroup.add(floor);

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

  loader.load(modelPath, (gltf) => {
    const deskScene = gltf.scene;
    const box = new THREE.Box3().setFromObject(deskScene);
    const minY = box.min.y;

    const rows = 3;
    const cols = 4;
    const spacing = 2.5;
    const xOffset = -((cols - 1) * spacing) / 2;
    const zOffset = -((rows - 1) * spacing) / 2;

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

        // loadLaptopInstance(gameState, sharedTexture).then(({ group: laptop, renderer }) => {
        //   laptop.position.y = deskTopY;
        //   clone.add(laptop);
        //   scene.userData.canvasRenderers ||= [];
        //   scene.userData.canvasRenderers.push(renderer);
        // });
loadLaptopInstance(sharedTexture).then(({ group: laptop }) => {
  laptop.position.y = deskTopY;
  clone.add(laptop);
});
      }
    }
  });

  loadWhiteboard(scene, roomWidth, sharedTexture);
}
