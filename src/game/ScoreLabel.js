import * as THREE from 'three';

export class ScoreLabel {
  constructor(scene, onReady) {
    this.scene = scene;
    this.sprite = this._createTextSprite('SCORE: 0');
    this.scene.add(this.sprite);
    this._score = -1;
    if (onReady) onReady();
  }

  update(score, isGameOver = false) {
    const rounded = Math.floor(score);
    if (isGameOver || rounded === this._score) return;

    this._score = rounded;
    const newText = `SCORE: ${rounded}`;
    this.scene.remove(this.sprite);
    this.sprite = this._createTextSprite(newText);
    this.sprite.position.set(8, 4.0, 0.1);
    this.scene.add(this.sprite);
  }

  _createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    ctx.fillStyle = 'black';
    ctx.font = '64px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5, 1.2, 1);
    return sprite;
  }

  dispose() {
    this.scene.remove(this.sprite);
    this.sprite.material.map.dispose();
    this.sprite.material.dispose();
  }
}
