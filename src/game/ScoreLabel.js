import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export class ScoreLabel {
  constructor(scene, onFontLoaded) {
    this.scene = scene;
    this.mesh = null;
    this.font = null;
    this._score = -1;

    const loader = new FontLoader();
    loader.load('/fonts/helvetiker_bold.typeface.json', (font) => {
      this.font = font;
      if (onFontLoaded) onFontLoaded(font);
    });
  }

  update(score, isGameOver = false) {
    const rounded = Math.floor(score);
    if (!this.font || isGameOver || rounded === this._score) return;

    this._score = rounded;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    const geometry = new TextGeometry(`SCORE: ${rounded}`, {
      font: this.font,
      size: 0.5,
      height: 0.2,
    });
    geometry.computeBoundingBox();
    geometry.center();

    const material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(8, 4.0, 0.1); // ⬅ Lowered Y position
    this.scene.add(this.mesh);
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }
}
