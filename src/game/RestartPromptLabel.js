import * as THREE from 'three';

export class RestartPromptLabel {
  constructor(scene) {
    this.scene = scene;
    this.sprite = this._createTextSprite('PRESS SPACE TO START');
    this.sprite.position.set(8, 3.2, 0.1);
    this.sprite.visible = false;
    this.scene.add(this.sprite);
  }

  updateBlink(time) {
    this.sprite.visible = Math.floor(time * 2) % 2 === 0;
  }

  hide() {
    this.sprite.visible = false;
  }

  _createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 256;

    ctx.fillStyle = 'black';
    ctx.font = '72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(10, 2.5, 1);
    return sprite;
  }

  dispose() {
    this.scene.remove(this.sprite);
    this.sprite.material.map.dispose();
    this.sprite.material.dispose();
  }
}
