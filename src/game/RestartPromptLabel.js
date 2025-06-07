import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export class RestartPromptLabel {
  constructor(scene, font) {
    const geometry = new TextGeometry('PRESS SPACE TO START', {
      font,
      size: 0.35,
      height: 0.1,
    });
    geometry.computeBoundingBox();
    geometry.center();

    const material = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(8, 3.2, 0.1);
    this.mesh.visible = false;

    scene.add(this.mesh);
    this.scene = scene;
  }

  updateBlink(time) {
    this.mesh.visible = Math.floor(time * 2) % 2 === 0;
  }

  hide() {
    this.mesh.visible = false;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
