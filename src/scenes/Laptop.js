import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CanvasRenderer } from '../render/CanvasRenderer.js';

const loader = new GLTFLoader();

export async function loadLaptopInstance(gameState) {
  return new Promise((resolve, reject) => {
    loader.load('/models/laptop.glb', (gltf) => {
      const laptop = gltf.scene;

      // Calculate bounding box to center and base-align the model
      const box = new THREE.Box3().setFromObject(laptop);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

const yOffset = -0.038;
    laptop.position.set(-center.x, -box.min.y + yOffset, -center.z);     
      // Optional: uniformly scale to fit desk
      const targetWidth = 0.6; // meters
      const scale = targetWidth / size.x;
      laptop.scale.setScalar(scale);

      // Create a wrapper to control position/rotation cleanly
      const wrapper = new THREE.Group();
      wrapper.add(laptop);

      // Apply desk-relative transform here:
      wrapper.rotation.y = -Math.PI / 2; // rotate to face forward
      wrapper.position.set(0.55, -10, 0); // tweak X, Y, Z here if needed

      // Add a screen anchor for future projection
      const screenAnchor = new THREE.Object3D();
      screenAnchor.name = 'ScreenAnchor';
      screenAnchor.position.set(0, size.y * 0.6, -size.z * 0.05);
      laptop.add(screenAnchor);


      const canvasRenderer = new CanvasRenderer(gameState);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.575, 0.35),
        new THREE.MeshBasicMaterial({ map: canvasRenderer.getTexture() })
      );
      screen.position.set(0, 0.23 + yOffset, 0.437);
      wrapper.add(screen);


      resolve({ group: wrapper,screenAnchor, renderer: canvasRenderer });

    }, undefined, reject);
  });
}
