import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export async function loadLaptopInstance() {
  return new Promise((resolve, reject) => {
    loader.load('/models/laptop.glb', (gltf) => {
      const laptop = gltf.scene;

      // Calculate bounding box to center and base-align the model
      const box = new THREE.Box3().setFromObject(laptop);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      // Center the model at origin and lift it so base is at y = 0
      laptop.position.set(-center.x, -box.min.y, -center.z);

      // Optional: uniformly scale to fit desk
      const targetWidth = 0.6; // meters
      const scale = targetWidth / size.x;
      laptop.scale.setScalar(scale);

      // Create a wrapper to control position/rotation cleanly
      const wrapper = new THREE.Group();
      wrapper.add(laptop);

      // Apply desk-relative transform here:
      wrapper.rotation.y = -Math.PI / 2; // rotate to face forward
      wrapper.position.set(0.55, 0, 0); // tweak X, Y, Z here if needed

      // Add a screen anchor for future projection
      const screenAnchor = new THREE.Object3D();
      screenAnchor.name = 'ScreenAnchor';
      screenAnchor.position.set(0, size.y * 0.6, -size.z * 0.05);
      laptop.add(screenAnchor);

      resolve({ group: wrapper, screenAnchor });
    }, undefined, reject);
  });
}
