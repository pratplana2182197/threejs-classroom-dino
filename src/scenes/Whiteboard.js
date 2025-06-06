import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CanvasRenderer } from '../render/CanvasRenderer.js';

const loader = new GLTFLoader();

export function loadWhiteboard(scene, roomWidth, gameState) {
  loader.load('/models/whiteboard.glb', (gltf) => {
    const board = gltf.scene;

    // Scale and align
    const tempBox = new THREE.Box3().setFromObject(board);
    const tempSize = new THREE.Vector3();
    tempBox.getSize(tempSize);

    const maxWidth = 9;
    const maxHeight = 3.5;
    const scaleFactor = Math.min(maxWidth / tempSize.x, maxHeight / tempSize.y);
    board.scale.setScalar(scaleFactor);

    const box = new THREE.Box3().setFromObject(board);
    const center = new THREE.Vector3();
    box.getCenter(center);
    board.position.set(-center.x, -box.min.y, -center.z);

    const wrapper = new THREE.Group();
    wrapper.add(board);
    wrapper.position.set(roomWidth / 2 - 0.75, 0, 0);
    wrapper.rotation.y = -Math.PI / 2;

    scene.add(wrapper);

    // Add canvas renderer texture
    const canvasRenderer = new CanvasRenderer(gameState);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.5),
      new THREE.MeshBasicMaterial({ map: canvasRenderer.getTexture() })
    );
    screen.position.set(0, 2.7, 0.025);
    wrapper.add(screen);

    scene.userData.canvasRenderers ||= [];
    scene.userData.canvasRenderers.push(canvasRenderer);
  });
}
