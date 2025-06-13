import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function loadWhiteboard(scene, roomWidth, texture) {
  const wrapper = new THREE.Group();
  wrapper.position.set(roomWidth / 2 - 0.75, 0, 0);
  wrapper.rotation.y = -Math.PI / 2;
  scene.add(wrapper);

  const screenMaterial = texture
    ? new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0x111111,
        emissiveIntensity: 0.1,
        side: THREE.DoubleSide,
      })
    : new THREE.MeshStandardMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
      });

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), screenMaterial);
  screen.name = "WhiteboardScreen";
  screen.position.set(0, 2.7, 0.025);
  screen.userData.isScreen = true;
  wrapper.add(screen);
  wrapper.screen = screen;

  loader.load('/models/whiteboard.glb', (gltf) => {
    const board = gltf.scene;

    const tempBox = new THREE.Box3().setFromObject(board);
    const tempSize = new THREE.Vector3();
    tempBox.getSize(tempSize);
    const scaleFactor = Math.min(9 / tempSize.x, 3.5 / tempSize.y);
    board.scale.setScalar(scaleFactor);

    const box = new THREE.Box3().setFromObject(board);
    const center = new THREE.Vector3();
    box.getCenter(center);
    board.position.set(-center.x, -box.min.y, -center.z);

    wrapper.add(board);
  });

  return wrapper; // ✅ RETURN wrapper with .screen attached
}
