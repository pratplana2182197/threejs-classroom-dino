import * as THREE from 'three';

export class PortalRenderer2D {
  constructor({ width = 512, height = 384 } = {}) {
    this.width = width;
    this.height = height;

    this.renderTarget = new THREE.WebGLRenderTarget(width, height);

    this.texture = this.renderTarget.texture;

    this.scene = null;
    this.camera = null;
  }

  setScene(scene) {
    this.scene = scene;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  render(renderer) {
    if (!this.scene || !this.camera) return;

    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(prevTarget);

  }

  getTexture() {
    return this.texture;
  }

  dispose() {
    this.renderTarget.dispose();
  }


}
