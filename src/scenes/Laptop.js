import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';

const loader = new GLTFLoader();

export async function loadLaptopInstance(sharedTexture) {
  // RectAreaLightUniformsLib.init(); // Required to enable RectAreaLight

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

      // Screen material
      // const laptopScreenMaterial = new THREE.MeshPhysicalMaterial({
      //   map: sharedTexture,
      //   color: 0xffffff,
      //   roughness: 0.05,
      //   metalness: 0.3,
      //   clearcoat: 1.0,
      //   clearcoatRoughness: 0.1,
      //   reflectivity: 0.4,
      //   emissive: 0x222222 ,
      //   emissiveIntensity: 0,
      //   transparent: false,
      //   side: THREE.FrontSide,
      // });
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
        new THREE.PlaneGeometry(0.58, 0.35),
        laptopScreenMaterial
      );
      screen.position.set(0, 0.21 + yOffset, 0.437);
      wrapper.add(screen);
      wrapper.screen = screen;

      const rectLight = new THREE.RectAreaLight(0xffffff, 5, 0.58, 0.35);

      // Position: same as screen + slightly in front (Z direction in screen local space)
      rectLight.position.copy(screen.position);
      rectLight.position.z +=  - 0.001; 
      rectLight.rotation.set(0, Math.PI, 0); 


      // Visualize axes for debugging
      const axesHelper = new THREE.AxesHelper(0.2);
      // rectLight.add(axesHelper);

      // Add to wrapper
      wrapper.add(rectLight);
      wrapper.add( new RectAreaLightHelper( rectLight ) );

      resolve(wrapper);
    }, undefined, reject);
  });
}
