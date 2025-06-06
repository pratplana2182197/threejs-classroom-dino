import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function loadWhiteboard(scene, roomWidth = 15) {
  loader.load('/models/whiteboard.glb', (gltf) => {
    const board = gltf.scene;

    // Optional: scale before bounding box
    const tempBox = new THREE.Box3().setFromObject(board);
    const tempSize = new THREE.Vector3();
    tempBox.getSize(tempSize);

    const maxWidth = 9;
    const maxHeight = 3.5;
    const scaleFactor = Math.min(maxWidth / tempSize.x, maxHeight / tempSize.y);
    board.scale.setScalar(scaleFactor);

    // Now compute bounding box AFTER scaling
    const box = new THREE.Box3().setFromObject(board);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // ✅ Align bottom of board to y = 0 and center X/Z
    board.position.set(-center.x, -box.min.y, -center.z);

    // Wrapper to position against the wall
    const wrapper = new THREE.Group();
    wrapper.add(board);

    // ✅ Place along right wall, facing left
    wrapper.position.set(roomWidth / 2 - 0.75, 0, 0); // X: near wall, Y: floor, Z: centered
    wrapper.rotation.y = -Math.PI / 2;

    // Enable shadows
    board.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(wrapper);
  }, undefined, (err) => {
    console.error('Error loading whiteboard:', err);
  });
}
