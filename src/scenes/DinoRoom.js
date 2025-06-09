import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export class DinoRoom {
  /**
   * @param {DinoGameState} gameState The shared game state instance.
   */
  constructor(gameState) {
    this.group = new THREE.Group();
    this.group.position.set(30, 0, 0);

    const room = new THREE.Mesh(
      new THREE.BoxGeometry(12, 6, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.BackSide, roughness: 0.8 })
    );
    room.position.y = 3;
    this.group.add(room);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 20),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.group.add(floor);

    this.group.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 8, 5);
    this.group.add(dirLight);

    // Game state and assets
    this.gameState = gameState;
    this.loader = new GLTFLoader();
    this.fontLoader = new FontLoader();
    this.models = {};
    this.font = null; 
    this.activeDino = null;
    this.obstacles = [];
    this.clock = new THREE.Clock();
    
    // Display properties
    this.scoreMesh = null;
    this.displayedScore = -1;
    this.gameOverMessage = null;
    this.blinkTimer = 0; // <<< NEW: Timer for blinking logic

    this._loadAssets();
  }

  async _loadAssets() {
    // ... (This method is unchanged)
    const loadModel = (path, rotY = 0) =>
      new Promise((resolve) => {
        this.loader.load(path, (gltf) => {
          const model = gltf.scene;
          model.scale.setScalar(0.7);
          model.rotation.y = rotY;
          resolve(model);
        });
      });
    const loadFont = (path) =>
        new Promise((resolve) => {
            this.fontLoader.load(path, resolve);
        });
    const [dino, dino_duck, cactus, bird, font] = await Promise.all([
        loadModel('/models/dino.glb', -Math.PI / 2),
        loadModel('/models/dino_duck.glb', -Math.PI / 2),
        loadModel('/models/cactus.glb', -Math.PI / 2),
        loadModel('/models/bird.glb', -Math.PI / 2),
        loadFont('/fonts/Press_Start_2P_Regular.typeface.json')
    ]);
    this.models = { dino, dino_duck, cactus, bird };
    this.font = font;
    this.activeDino = this.models.dino;
    this.group.add(this.activeDino);
    this._storeBoundingSizes();
    this._updateScoreDisplay();
  }

  _storeBoundingSizes() {
    // ... (This method is unchanged)
    const size = (obj) => {
      const box = new THREE.Box3().setFromObject(obj);
      const v = new THREE.Vector3();
      box.getSize(v);
      return { width: v.z, height: v.y };
    };
    const d = this.gameState.dino;
    Object.assign(d, size(this.models.dino));
    Object.assign(d, {
      duckWidth: size(this.models.dino_duck).width,
      duckHeight: size(this.models.dino_duck).height
    });
    this.gameState.obstacleDimensions.cactus = size(this.models.cactus);
    this.gameState.obstacleDimensions.bird = size(this.models.bird);
  }

  // === THIS METHOD IS UNCHANGED, AS YOU REQUESTED ===
  _updateScoreDisplay() {
    if (!this.font) return; 

    const score = Math.floor(this.gameState.score);
    if (score === this.displayedScore) return; 

    if (this.scoreMesh) {
        this.group.remove(this.scoreMesh);
        this.scoreMesh.geometry.dispose();
        this.scoreMesh.material.dispose();
    }
    
    const scoreString = 'SCORE: ' + String(score).padStart(5, '0');

    const textGeometry = new TextGeometry(scoreString, {
        font: this.font,
        size: 0.9,
        depth: 0.3,
    });

    const textMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    this.scoreMesh = new THREE.Mesh(textGeometry, textMaterial);
    
    const rightWallX = 12 / 2 - 0.2;
    this.scoreMesh.position.set(rightWallX - 3, 3.5, -6);
    this.scoreMesh.rotation.y = -Math.PI / 2;

    this.group.add(this.scoreMesh);
    this.displayedScore = score;
  }
  
  // === THIS METHOD IS UPDATED WITH THE NEW BLINKING LOGIC ===
  _handleGameOverMessage(deltaTime) {
    if (this.gameState.gameOver) {
        if (!this.gameOverMessage) {
            const messageGeo = new TextGeometry('Press SPACE to start', {
                font: this.font,
                size: 0.4,
                depth: 0.1,
            });
            const messageMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            this.gameOverMessage = new THREE.Mesh(messageGeo, messageMat);

            const rightWallX = 12 / 2 - 0.2;
            this.gameOverMessage.position.set(rightWallX - 3, 2.5, -6);
            this.gameOverMessage.rotation.y = -Math.PI / 2;
            
            this.group.add(this.gameOverMessage);
        }

        // More robust blinking logic using a timer and delta time
        this.blinkTimer += deltaTime;
        const blinkRate = 0.5; // Blink every half second

        if(this.blinkTimer >= blinkRate) {
          this.gameOverMessage.visible = !this.gameOverMessage.visible;
          this.blinkTimer = 0; // Reset the timer
        }

    } else if (this.gameOverMessage) {
        // If the game is restarted, ensure the message is removed and reset
        this.group.remove(this.gameOverMessage);
        this.gameOverMessage.geometry.dispose();
        this.gameOverMessage.material.dispose();
        this.gameOverMessage = null;
        this.blinkTimer = 0; // Reset timer for the next game over
    }
  }

  update() {
    if (!this.font || !this.models.dino || !this.models.dino_duck) return;

    const delta = this.clock.getDelta(); // <<< NEW: Get time between frames for the timer

    this._updateScoreDisplay();
    this._handleGameOverMessage(delta); // <<< Pass delta to the handler

    // ... The rest of the update method is unchanged ...
    const ducking = this.gameState.dino.ducking;
    const next = ducking ? this.models.dino_duck : this.models.dino;

    if (this.activeDino !== next) {
      this.group.remove(this.activeDino);
      this.activeDino = next;
      this.group.add(this.activeDino);
    }

    const y = this.gameState.dino.y;
    const yOffset = ducking ? -0.6 : 0;
    this.activeDino.position.set(0, y + yOffset, 0);

    const logicObs = this.gameState.obstacles;

    while (this.obstacles.length > logicObs.length) {
      const gone = this.obstacles.pop();
      this.group.remove(gone.mesh);
    }

    for (let i = 0; i < logicObs.length; i++) {
      const o = logicObs[i];
      const obstacleZ = o.x;

      if (i >= this.obstacles.length) {
        const mesh = this.models[o.type].clone();
        mesh.scale.setScalar(0.7);
        mesh.position.set(0, o.y, obstacleZ);
        this.group.add(mesh);
        this.obstacles.push({ mesh, type: o.type });
      } else if (this.obstacles[i].type !== o.type) {
        this.group.remove(this.obstacles[i].mesh);
        const mesh = this.models[o.type].clone();
        mesh.scale.setScalar(0.7);
        mesh.position.set(0, o.y, obstacleZ);
        this.group.add(mesh);
        this.obstacles[i] = { mesh, type: o.type };
      } else {
        this.obstacles[i].mesh.position.set(0, o.y, obstacleZ);
      }
    }
  }

  get mesh() {
    return this.group;
  }
}