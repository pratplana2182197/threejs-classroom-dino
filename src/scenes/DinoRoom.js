import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export class DinoRoom {
  constructor(gameState) {
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 0);

    this.roomHeight = 11;
    this.roomWidth = 12;
    const roomDepth = 20;

    const windowWidth = 4.8;
    const windowHeight = 3.0;
    const windowY = 4;

    const textureLoader = new THREE.TextureLoader();
    const jungleTexture = textureLoader.load('/textures/jungle.png');
    jungleTexture.wrapS = THREE.RepeatWrapping;
    jungleTexture.wrapT = THREE.RepeatWrapping;


    this.backWallMaterial = new THREE.MeshStandardMaterial({ 
      map: jungleTexture,
      color: 0xffffff, 
      roughness: 0.2,
      metalness: 0.0,
      emissive: 0x111111,
      emissiveIntensity: 0.1
    });

    const wallMaterial = new THREE.MeshBasicMaterial({ 
      map: jungleTexture
    });

    this.backWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, this.roomHeight, roomDepth), this.backWallMaterial);
    this.backWall.position.set(this.roomWidth / 2, this.roomHeight / 2, 0);
    this.backWall.name = "backWall";
    this.backWall.receiveShadow = true;
    this.group.add(this.backWall);

    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, this.roomHeight, roomDepth),
      wallMaterial.clone()
    );
    frontWall.position.set(-this.roomWidth / 2, this.roomHeight / 2, 0);
    frontWall.name = "frontWall";
    frontWall.castShadow = false;
    frontWall.receiveShadow = true;
    this.group.add(frontWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(this.roomWidth, this.roomHeight, 0.1), wallMaterial.clone());
    rightWall.position.set(0, this.roomHeight / 2, roomDepth / 2);
    rightWall.name = "rightWall";
    rightWall.receiveShadow = true;
    this.group.add(rightWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(this.roomWidth, this.roomHeight, 0.1), wallMaterial.clone());
    leftWall.position.set(0, this.roomHeight / 2, -roomDepth / 2);
    leftWall.name = "leftWall";
    leftWall.receiveShadow = true;
    this.group.add(leftWall);

    const skyTexture = textureLoader.load('/textures/jungle_sky.png');
    skyTexture.wrapS = THREE.RepeatWrapping;
    skyTexture.wrapT = THREE.RepeatWrapping;
    skyTexture.repeat.set(1, 1);

    const ceilingMaterial = new THREE.MeshBasicMaterial({ 
      map: skyTexture
    });

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(this.roomWidth, 0.1, roomDepth), ceilingMaterial);
    ceiling.position.set(0, this.roomHeight, 0);
    ceiling.name = "ceiling";
    ceiling.castShadow = false;
    ceiling.receiveShadow = true;
    this.group.add(ceiling);

    // Floor with moving texture
    this.floorTexture = textureLoader.load('/textures/jungle_floor3.png');
    this.floorTexture.wrapS = THREE.RepeatWrapping;
    this.floorTexture.wrapT = THREE.RepeatWrapping;
    
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomWidth, roomDepth), 
      new THREE.MeshStandardMaterial({ 
        map: this.floorTexture,
        roughness: 1,
        metalness: 0.0
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "floor";
    floor.castShadow = false;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Store reference to floor for texture animation
    this.floor = floor;
    

    // Transparent canvas surface used for portal rendering
    const dinoCanvasMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: null,
      roughness: 0.3,
      metalness: 0.0,
      emissive: 0x111111,
      emissiveIntensity: 3,
      transparent: true,
      side: THREE.FrontSide,
    });

    const dinoCanvasGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
    dinoCanvasGeometry.scale(-1, 1, 1);
    const dinoCanvas = new THREE.Mesh(dinoCanvasGeometry, dinoCanvasMaterial);
    dinoCanvas.rotation.y = -Math.PI / 2;
    dinoCanvas.position.set(-this.roomWidth / 2 + 0.2, windowY, 0);
    dinoCanvas.name = "dinoCanvas";
    dinoCanvas.castShadow = false;
    dinoCanvas.receiveShadow = false;
    this.group.add(dinoCanvas);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.group.add(ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.dirLight.position.set(this.roomWidth / 2 + 4, this.roomHeight/2, 0);
    this.dirLight.target.position.set(this.roomWidth + 10, this.roomHeight/2, 0);
    this.group.add(this.dirLight.target);
    this.dirLight.castShadow = true;
    this.group.add(this.dirLight);


    this.dirLight.shadow.camera.left = -roomDepth / 2;
    this.dirLight.shadow.camera.right = roomDepth / 2;


    this.gameState = gameState;
    this.loader = new GLTFLoader();
    this.fontLoader = new FontLoader();
    this.models = {};
    this.font = null; 
    this.activeDino = null;
    this.obstacles = [];
    this.clock = new THREE.Clock();

    this.scoreMesh = null;
    this.displayedScore = -1;
    this.gameOverMessage = null;
    this.blinkTimer = 0;

    // Track texture offset for smooth animation
    this.floorOffset = 0;

    this.fogCubes = [];
this.fogSpawned = false;


    this._loadAssets();
  }




  async _loadAssets() {
    if (this._assetsPromise) return this._assetsPromise;
    this._assetsPromise = (async () => {
      const loadModel = (path, rotY = 0) =>
        new Promise((resolve) => {
          this.loader.load(path, (gltf) => {
              const model = gltf.scene;
              model.scale.setScalar(0.7);
              model.rotation.y = rotY;
              model.traverse(child => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
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
        loadFont('/fonts/Press_Start_2P_Regular.typeface.json'),
      ]);


      this.models = { dino, dino_duck, cactus, bird };
      this.font = font;
      this.activeDino = this.models.dino;
      this.group.add(this.activeDino);
      this.activeDino.name = "dino";

      this._storeBoundingSizes();
      this._updateScoreDisplay();
    })();
    return this._assetsPromise;
  }

  _storeBoundingSizes() {
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
    this.scoreMesh.castShadow = false;
    this.scoreMesh.receiveShadow = false;
    const rightWallX = 12 / 2 - 0.2;
    this.scoreMesh.position.set(rightWallX - 3, 6, -7.5);
    this.scoreMesh.rotation.y = -Math.PI / 2;
    this.group.add(this.scoreMesh);
    this.displayedScore = score;
  }
  
  _handleGameOverMessage(deltaTime) {
    if (this.gameState.gameOver && this.gameState.restartCooldown <= 0) {
      if (!this.gameOverMessage) {
        const messageGeo = new TextGeometry('Press SPACE to start', {
          font: this.font,
          size: 0.4,
          depth: 0.1,
        });
        const messageMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.gameOverMessage = new THREE.Mesh(messageGeo, messageMat);
        const rightWallX = 12 / 2 - 0.2;
        this.gameOverMessage.position.set(rightWallX - 3, 5, -5.5);
        this.gameOverMessage.rotation.y = -Math.PI / 2;
        this.group.add(this.gameOverMessage);
      }
      this.blinkTimer += deltaTime;
      const blinkRate = 0.5;
      if(this.blinkTimer >= blinkRate) {
        this.gameOverMessage.visible = !this.gameOverMessage.visible;
        this.blinkTimer = 0;
      }
    } else if (this.gameOverMessage) {
      this.group.remove(this.gameOverMessage);
      this.gameOverMessage.geometry.dispose();
      this.gameOverMessage.material.dispose();
      this.gameOverMessage = null;
      this.blinkTimer = 0;
    }
  }

 _updateFloorMovement() {
  if (!this.gameState.gameOver && this.floorTexture) {
    // Just apply the offset calculated in game state
    this.floorTexture.offset.y = this.gameState.floorOffset || 0;
  }
}

  update() {
    if (!this.font || !this.models.dino || !this.models.dino_duck) return;
    const delta = this.clock.getDelta();
    
    // Update floor movement
    this._updateFloorMovement(delta);
    
    this._updateScoreDisplay();
    this._handleGameOverMessage(delta);
    
    const ducking = this.gameState.dino.ducking;
    const next = ducking ? this.models.dino_duck : this.models.dino;
    if (this.activeDino !== next) {
      this.group.remove(this.activeDino);
      this.activeDino = next;
      this.group.add(this.activeDino);
      this.activeDino.name = "dino";
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
      let mesh;
      if (i >= this.obstacles.length) {
        mesh = this.models[o.type].clone();
        mesh.name = `obstacle_${o.type}_${i}`;
        this.group.add(mesh);
        this.obstacles.push({ mesh, type: o.type });
      } else if (this.obstacles[i].type !== o.type) {
        this.group.remove(this.obstacles[i].mesh);
        mesh = this.models[o.type].clone();
        mesh.name = `obstacle_${o.type}_${i}`;
        this.group.add(mesh);
        this.obstacles[i] = { mesh, type: o.type };
      } else {
        mesh = this.obstacles[i].mesh;
      }
      mesh.scale.setScalar(0.7);
      mesh.position.set(0, o.y, obstacleZ);
    }

  }

  get mesh() {
    return this.group;
  }
}