import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class FirstPersonControls {
  constructor(camera, domElement) {
    this.camera = camera; 
    this.domElement = domElement;
    this.controls = new PointerLockControls(camera, domElement);

    this.move = {
      forward: false,
      back: false,
      left: false,
      right: false
    };

    this.direction = new THREE.Vector3();
    this.speed = 10;
    this.clock = new THREE.Clock(); 

    this.initEvents();
  }

  enable(scene) {
    scene.add(this.controls.object);
    this.domElement.addEventListener('click', () => {
      this.controls.lock();
    });
  }

  initEvents() {
    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': this.move.forward = true; break;
        case 'KeyS': this.move.back = true; break;
        case 'KeyA': this.move.left = true; break;
        case 'KeyD': this.move.right = true; break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.move.forward = false; break;
        case 'KeyS': this.move.back = false; break;
        case 'KeyA': this.move.left = false; break;
        case 'KeyD': this.move.right = false; break;
      }
    });
  }

  update() {
    const delta = this.clock.getDelta(); 

    // Calculate movement input direction
    this.direction.z = Number(this.move.forward) - Number(this.move.back);
    this.direction.x = Number(this.move.right) - Number(this.move.left);
    this.direction.normalize();

    if (this.controls.isLocked) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward); 

      const moveVector = new THREE.Vector3();

      // Apply forward/backward movement
      if (this.move.forward) moveVector.add(forward);
      if (this.move.back) moveVector.sub(forward);

      // Compute right vector as camera.up × forward
      const right = new THREE.Vector3();
      right.crossVectors(this.camera.up, forward).normalize();

      // Apply left/right movement
      if (this.move.left) moveVector.add(right);
      if (this.move.right) moveVector.sub(right);

      // Normalize direction and scale by speed and delta time
      moveVector.normalize().multiplyScalar(this.speed * delta);

      // Apply movement to camera
      this.controls.object.position.add(moveVector);
    }
  }
}
