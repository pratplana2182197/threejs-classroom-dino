import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class CanvasRenderer {
  constructor(gameState, width = 1024, height = 512) {
    this.gameState = gameState;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.OrthographicCamera(0, 20, 5, 0, 0.1, 100);
    this.camera.position.z = 10;

    this.renderTarget = new THREE.WebGLRenderTarget(width, height);
    this.renderTarget.texture.encoding = THREE.sRGBEncoding;

    this.models = {};
    this.mixers = [];
    this.activeObstacles = [];

    this.loader = new GLTFLoader();
    this.loaded = false;

    this._initScene();
  }

  async _initScene() {
    this.models.dino = await this._loadModel('/models/dino.glb', true);
    this.models.dino_duck = await this._loadModel('/models/dino_duck.glb');
    this.models.cactus = await this._loadModel('/models/cactus.glb');
    this.models.bird = await this._loadModel('/models/bird.glb', true);

    this.scene.add(this.models.dino.object);
    this.activeDino = this.models.dino;

    this.loaded = true;
  }

  async _loadModel(path, animate = false) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (gltf) => {
        const object = gltf.scene;
        object.scale.setScalar(0.7);

        const model = { object: object };

        if (animate && gltf.animations.length > 0) {
          model.animClip = gltf.animations[0];
        }

        resolve(model);
      }, undefined, reject);
    });
  }

  _switchDinoModel(useDuck) {
    const newModel = useDuck ? this.models.dino_duck : this.models.dino;
    if (this.activeDino !== newModel) {
      this.scene.remove(this.activeDino.object);
      this.scene.add(newModel.object);
      this.activeDino = newModel;
    }
  }

  updateSceneFromGameState(deltaTime) {
    if (!this.loaded) return;

    // Dino model switching
    const useDuck = this.gameState.dino.ducking;
    this._switchDinoModel(useDuck);

    const dinoY = this.gameState.dino.y + (useDuck ? -0.2 : 0); // slightly lower when ducking
    this.activeDino.object.position.set(this.gameState.dino.x + 2, dinoY, 0);

    // Update mixers (bird only)
    this.mixers.forEach((mixer) => mixer.update(deltaTime));

    // Sync obstacles with game state
    while (this.activeObstacles.length < this.gameState.obstacles.length) {
      const data = this.gameState.obstacles[this.activeObstacles.length];
      const model = this.models[data.type];

      if (!model || !model.object) {
        console.warn(`Missing model for obstacle type: ${data.type}`);
        continue;
      }

      const clone = model.object.clone(true);
      const entry = { mesh: clone, type: data.type };

      if (data.type === 'bird' && model.animClip) {
        const mixer = new THREE.AnimationMixer(clone);
        const action = mixer.clipAction(model.animClip);
        action.play();
        this.mixers.push(mixer);
        entry.mixer = mixer;
      }

      this.scene.add(clone);
      this.activeObstacles.push(entry);
    }

    // Update positions
    for (let i = 0; i < this.gameState.obstacles.length; i++) {
      const obstacle = this.gameState.obstacles[i];
      const entry = this.activeObstacles[i];
      entry.mesh.position.set(obstacle.x, obstacle.y, 0);
    }

    // Remove excess obstacles
    while (this.activeObstacles.length > this.gameState.obstacles.length) {
      const entry = this.activeObstacles.pop();
      if (entry.mixer) {
        const idx = this.mixers.indexOf(entry.mixer);
        if (idx !== -1) this.mixers.splice(idx, 1);
      }
      this.scene.remove(entry.mesh);
    }
  }

  render(renderer) {
    if (!this.loaded) return;
    const delta = this.gameState._time > 0 ? this.gameState._time : 0.016;
    this.updateSceneFromGameState(delta);
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
  }

  getTexture() {
    return this.renderTarget.texture;
  }
}
