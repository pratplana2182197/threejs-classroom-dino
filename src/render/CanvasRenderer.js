import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BoxHelper } from 'three';
import { ScoreLabel } from '../game/ScoreLabel.js';
import { RestartPromptLabel } from '../game/RestartPromptLabel.js';

export class CanvasRenderer {
  constructor(gameState, width = 1024, height = 512) {
    this.gameState = gameState;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.OrthographicCamera(-2, 18, 5, 0, 0.1, 100);
    this.camera.position.z = 10;

    this.renderTarget = new THREE.WebGLRenderTarget(width, height);
    this.renderTarget.texture.encoding = THREE.sRGBEncoding;

    this.models = {};
    this.activeObstacles = [];
    this.loader = new GLTFLoader();
    this.loaded = false;

    this.dinoBoxHelper = null;
    this.scoreLabel = null;
    this.restartPrompt = null;

    this.deathTime = null;
    this.allowRestart = false;

    this._initScene();
  }

  async _initScene() {
    this.models.dino = await this._loadModel('/models/dino.glb');
    this.models.dino_duck = await this._loadModel('/models/dino_duck.glb');
    this.models.cactus = await this._loadModel('/models/cactus.glb');
    this.models.bird = await this._loadModel('/models/bird.glb');

    this.scene.add(this.models.dino.object);
    this.activeDino = this.models.dino;

    this._storeBoundingSizes();

    this.dinoBoxHelper = new BoxHelper(this.activeDino.object, 0x00ff00);
    this.scene.add(this.dinoBoxHelper);

    this.scoreLabel = new ScoreLabel(this.scene, (font) => {
      this.restartPrompt = new RestartPromptLabel(this.scene, font);
    });

    this.loaded = true;
  }

  _storeBoundingSizes() {
    const sizeOf = (object) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);
      return { width: size.x, height: size.y };
    };

    Object.assign(this.gameState.dino, sizeOf(this.models.dino.object));
    Object.assign(this.gameState.dino, {
      duckWidth: sizeOf(this.models.dino_duck.object).width,
      duckHeight: sizeOf(this.models.dino_duck.object).height
    });

    this.gameState.obstacleDimensions.cactus = sizeOf(this.models.cactus.object);
    this.gameState.obstacleDimensions.bird = sizeOf(this.models.bird.object);
  }

  async _loadModel(path) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          const object = gltf.scene;
          object.scale.setScalar(0.7);
          object.visible = true;
          resolve({ object });
        },
        undefined,
        reject
      );
    });
  }

  _switchDinoModel(useDuck) {
    const newModel = useDuck ? this.models.dino_duck : this.models.dino;
    if (this.activeDino !== newModel) {
      this.scene.remove(this.activeDino.object);
      this.scene.add(newModel.object);

      this.scene.remove(this.dinoBoxHelper);
      this.dinoBoxHelper = new BoxHelper(newModel.object, 0x00ff00);
      this.scene.add(this.dinoBoxHelper);

      this.activeDino = newModel;
    }
  }

  updateSceneFromGameState(deltaTime) {
    if (!this.loaded) return;

    const useDuck = this.gameState.dino.ducking;
    this._switchDinoModel(useDuck);

    const yOffset = useDuck ? -0.7 : 0;
    const dinoY = this.gameState.dino.y + yOffset;
    this.activeDino.object.position.set(this.gameState.dino.x, dinoY, 0);

    if (this.dinoBoxHelper) this.dinoBoxHelper.update();

    while (this.activeObstacles.length > this.gameState.obstacles.length) {
      const entry = this.activeObstacles.pop();
      this.scene.remove(entry.mesh);
      if (entry.boxHelper) this.scene.remove(entry.boxHelper);
    }

    for (let i = 0; i < this.gameState.obstacles.length; i++) {
      const data = this.gameState.obstacles[i];

      if (i >= this.activeObstacles.length) {
        this._createObstacle(i, data);
      } else if (this.activeObstacles[i].type !== data.type) {
        this._replaceObstacle(i, data);
      } else {
        const entry = this.activeObstacles[i];
        entry.mesh.position.set(data.x, data.y, 0);
        if (entry.boxHelper) entry.boxHelper.update();
      }
    }

    this.scoreLabel?.update(this.gameState.score, this.gameState.gameOver);

    if (this.gameState.gameOver) {
      if (this.deathTime === null) this.deathTime = this.gameState._time;
      const timeSinceDeath = this.gameState._time - this.deathTime;

      if (this.restartPrompt) {
        this.restartPrompt.updateBlink(timeSinceDeath);
      }

      this.allowRestart = timeSinceDeath > 2;
    } else {
      this.restartPrompt?.hide();
      this.deathTime = null;
      this.allowRestart = false;
    }
  }

  _createObstacle(index, data) {
    const model = this.models[data.type];
    if (!model) return;

    const clone = model.object.clone(true);
    clone.position.set(data.x, data.y, 0);

    const boxHelper = new BoxHelper(clone, 0xff00ff);
    this.scene.add(clone);
    this.scene.add(boxHelper);

    this.activeObstacles[index] = {
      mesh: clone,
      type: data.type,
      boxHelper
    };
  }

  _replaceObstacle(index, data) {
    const old = this.activeObstacles[index];
    this.scene.remove(old.mesh);
    if (old.boxHelper) this.scene.remove(old.boxHelper);
    this._createObstacle(index, data);
  }

  render(renderer, deltaTime) {
    if (!this.loaded) return;
    this.updateSceneFromGameState(deltaTime);
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
  }

  reset() {
    this.deathTime = null;
    this.allowRestart = false;

    this.activeObstacles.forEach((entry) => {
      this.scene.remove(entry.mesh);
      entry.mesh.geometry?.dispose();
      entry.mesh.material?.dispose();
      if (entry.boxHelper) this.scene.remove(entry.boxHelper);
    });
    this.activeObstacles = [];

    this.restartPrompt?.hide();
  }

  getTexture() {
    return this.renderTarget.texture;
  }

  dispose() {
    this.activeObstacles.forEach((entry) => {
      this.scene.remove(entry.mesh);
      entry.mesh.geometry?.dispose();
      entry.mesh.material?.dispose();
      if (entry.boxHelper) this.scene.remove(entry.boxHelper);
    });

    Object.values(this.models).forEach((model) => {
      if (model?.object) this.scene.remove(model.object);
    });

    if (this.dinoBoxHelper) this.scene.remove(this.dinoBoxHelper);
    this.scoreLabel?.dispose();
    this.restartPrompt?.dispose(this.scene);
    this.renderTarget.dispose();
  }
}
