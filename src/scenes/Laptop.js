import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';

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
      const scale = targetWidth / size.x / 1.5;
      laptop.scale.setScalar(scale);

      const wrapper = new THREE.Group();
      wrapper.add(laptop);
      wrapper.rotation.y = -Math.PI / 2;
      wrapper.position.set(0.55, -10, 0);


      const laptopScreenMaterial = new THREE.MeshStandardMaterial({
        map: sharedTexture,
        emissiveMap: sharedTexture,
        emissive: 0xffffff,
        emissiveIntensity: 0.5,      
        roughness: 0.2,
        metalness: 0.1,
        color: 0xfefefe
      });

      // Screen geometry
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.58 / 1.5, 0.34 / 1.5),
        laptopScreenMaterial
      );
      screen.position.set(0, 0.14 + yOffset, 0.509);
      wrapper.add(screen);
      wrapper.screen = screen;

      const rectLight = new THREE.RectAreaLight(0xffffff, 5, 0.58, 0.34);

      // Position: same as screen + slightly in front (Z direction in screen local space)
      rectLight.position.copy(screen.position);
      rectLight.position.z +=  - 0.0005; 
      rectLight.rotation.set(0, Math.PI, 0); 


      // Axes for debugging
      const axesHelper = new THREE.AxesHelper(0.2);
      // rectLight.add(axesHelper);

      // Add to wrapper
      wrapper.add(rectLight);
      wrapper.add( new RectAreaLightHelper( rectLight ) );

      resolve(wrapper);
    }, undefined, reject);
  });
}
