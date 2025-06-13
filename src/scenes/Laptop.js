import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export async function loadLaptopInstance(sharedTexture) {
  return new Promise((resolve, reject) => {
    loader.load('/models/laptop.glb', (gltf) => {
      const laptop = gltf.scene;

      const box = new THREE.Box3().setFromObject(laptop);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const yOffset = -0.038;
      laptop.position.set(-center.x, -box.min.y + yOffset, -center.z);

      const targetWidth = 0.6;
      const scale = targetWidth / size.x;
      laptop.scale.setScalar(scale);

      const wrapper = new THREE.Group();
      wrapper.add(laptop);
      wrapper.rotation.y = -Math.PI / 2;
      wrapper.position.set(0.55, -10, 0);

      const screenAnchor = new THREE.Object3D();
      screenAnchor.name = 'ScreenAnchor';
      screenAnchor.position.set(0, size.y * 0.6, -size.z * 0.05);
      laptop.add(screenAnchor);

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.575, 0.35),
        new THREE.MeshStandardMaterial({
          map: sharedTexture,
          side: THREE.DoubleSide,
        })
      );
      screen.position.set(0, 0.23 + yOffset, 0.437);
      wrapper.add(screen);
      wrapper.screen = screen; // ✅ attach reference to wrapper

      resolve(wrapper); // ✅ return only the wrapper
    }, undefined, reject);
  });
}
