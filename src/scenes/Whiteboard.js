import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function loadWhiteboard(scene, roomWidth, texture) {
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

    const wrapper = new THREE.Group();
    wrapper.add(board);
    wrapper.position.set(roomWidth / 2 - 0.75, 0, 0);
    wrapper.rotation.y = -Math.PI / 2;
    scene.add(wrapper);

    // Debug: Log texture info
    console.log('Whiteboard texture received:', texture);
    console.log('Texture type:', texture?.constructor.name);
    console.log('Texture image:', texture?.image);
    
    const screenMaterial = texture
      ? new THREE.MeshBasicMaterial({ 
          map: texture,
          side: THREE.DoubleSide
        })
      : new THREE.MeshBasicMaterial({ 
          color: 0xff0000,
          side: THREE.DoubleSide 
        });

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), screenMaterial);
    screen.name = "Whiteboard"
    screen.position.set(0, 2.7, 0.025);
    wrapper.add(screen);
    
    console.log('Whiteboard wrapper position:', wrapper.position);
    console.log('Whiteboard wrapper rotation:', wrapper.rotation);
    console.log('Screen position:', screen.position);
    console.log('Screen material:', screenMaterial);
    
    // Debug: Log if texture has actual image data
    if (texture && texture.image) {
      console.log('Texture image dimensions:', texture.image.width, 'x', texture.image.height);
      console.log('Texture needs update:', texture.needsUpdate);
    }
  });
}