import * as THREE from 'three';

export class PortalRenderer2D {
  constructor({ width = 512, height = 384 } = {}) {
    this.width = width;
    this.height = height;

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    this.texture = this.renderTarget.texture;
    this.texture.needsUpdate = true;

    this.scene = null;
    this.camera = null;
  }

  /**
   * Set the scene to render.
   */
  setScene(scene) {
    this.scene = scene;
  }

  /**
   * Set a custom camera to use for rendering.
   */
  setCamera(camera) {
    this.camera = camera;
  }

  /**
   * Render the scene with the specified camera to the render target.
   */
  render(renderer) {
    if (!this.scene || !this.camera) return;

    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(prevTarget);

    this.texture.needsUpdate = true;
  }

  getTexture() {
    return this.texture;
  }

  dispose() {
    this.renderTarget.dispose();
  }


  setNewRenderTarget() {
  this.renderTarget.dispose();
  this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  });
}


}
