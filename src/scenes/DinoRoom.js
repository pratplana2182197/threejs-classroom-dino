import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';


export class DinoRoom {
  constructor(gameState) {
    this.group = new THREE.Group();
    this.group.position.set(30, 0, 0);
    this.group.layers.enableAll();

    this.roomHeight = 11;
    const roomWidth = 12;
    const roomDepth = 20;

    const windowWidth = 4.8;
    const windowHeight = 3.0;
    const windowY = 4;

    // Pure white wall material with emissive component to ensure brightness
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      roughness: 0.2,
      metalness: 0.0,
      emissive: 0x111111, // Slight emissive to ensure walls appear white
      emissiveIntensity: 0.1
    });

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, this.roomHeight, roomDepth), wallMaterial.clone());
    backWall.position.set(roomWidth / 2, this.roomHeight / 2, 0);
    backWall.name = "backWall";
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.group.add(backWall);
    backWall.layers.enableAll();

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, this.roomHeight, 0.1), wallMaterial.clone());
    rightWall.position.set(0, this.roomHeight / 2, roomDepth / 2);
    rightWall.name = "rightWall";
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    this.group.add(rightWall);
    rightWall.layers.enableAll();

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, this.roomHeight, 0.1), wallMaterial.clone());
    leftWall.position.set(0, this.roomHeight / 2, -roomDepth / 2);
    leftWall.name = "leftWall";
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.group.add(leftWall);
    leftWall.layers.enableAll();

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, 0.1, roomDepth), wallMaterial.clone());
    ceiling.position.set(0, this.roomHeight, 0);
    ceiling.name = "ceiling";
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    this.group.add(ceiling);
    ceiling.layers.enableAll();

    // Improved floor material - slightly off-white for contrast
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomWidth, roomDepth), 
      new THREE.MeshStandardMaterial({ 
        color: 0xf8f8f8, 
        roughness: 0.2,
        metalness: 0.0
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "floor";
    floor.castShadow = true;
    floor.receiveShadow = true;
    this.group.add(floor);
    floor.layers.enableAll();

    const frontWallMaterial = wallMaterial.clone();

    const frontWallBottom = new THREE.Mesh(new THREE.BoxGeometry(0.1, windowY - windowHeight / 2, roomDepth), frontWallMaterial);
    frontWallBottom.position.set(-roomWidth / 2, (windowY - windowHeight / 2) / 2, 0);
    frontWallBottom.name = "frontWall_Bottom";
    frontWallBottom.castShadow = true;
    frontWallBottom.receiveShadow = true;
    this.group.add(frontWallBottom);

    const frontWallTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, this.roomHeight - (windowY + windowHeight / 2), roomDepth), frontWallMaterial);
    frontWallTop.position.set(-roomWidth / 2, (windowY + windowHeight / 2) + (this.roomHeight - (windowY + windowHeight / 2)) / 2, 0);
    frontWallTop.name = "frontWall_Top";
    frontWallTop.castShadow = true;
    frontWallTop.receiveShadow = true;
    this.group.add(frontWallTop);

    const frontWallSide1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, windowHeight, (roomDepth / 2) - (windowWidth / 2)), frontWallMaterial);
    frontWallSide1.position.set(-roomWidth / 2, windowY, -(roomDepth / 2) + ((roomDepth / 2) - (windowWidth / 2)) / 2);
    frontWallSide1.name = "frontWall_LeftSide";
    frontWallSide1.castShadow = true;
    frontWallSide1.receiveShadow = true;
    this.group.add(frontWallSide1);

    const frontWallSide2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, windowHeight, (roomDepth / 2) - (windowWidth / 2)), frontWallMaterial);
    frontWallSide2.position.set(-roomWidth / 2, windowY, (roomDepth / 2) - ((roomDepth / 2) - (windowWidth / 2)) / 2);
    frontWallSide2.name = "frontWall_RightSide";
    frontWallSide2.castShadow = true;
    frontWallSide2.receiveShadow = true;
    this.group.add(frontWallSide2);


    const windowMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,                // base color: white
  map: null,                      // will be set to the portal texture later
  roughness: 0.3,
  metalness: 0.0,
  emissive: 0x111111,             // slight glow in darkness
  emissiveIntensity: 3,
  transparent: true,
  side: THREE.FrontSide
});

  const geometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
geometry.scale(-1, 1, 1);  // Flip horizontally

const windowMesh = new THREE.Mesh(geometry, windowMaterial);

  // Rotate and position it perfectly inside the window cut-out
  windowMesh.rotation.y = -Math.PI / 2;
  windowMesh.position.set(
    -roomWidth / 2 + 0.01, // slightly in front of the front wall
    windowY,
    0
  );

  windowMesh.name = "DinoWindow";
  windowMesh.castShadow = false;
  windowMesh.receiveShadow = false;
  windowMesh.layers.enableAll();

  this.group.add(windowMesh);

    // Improved lighting setup - light from front wall toward back wall
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.group.add(ambientLight);
    ambientLight.layers.enableAll();

    // Main directional light from front wall area, shining toward back wall
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(-roomWidth / 2 + 2, this.roomHeight/2, 0); // From front wall area
    dirLight.target.position.set(roomWidth / 2, this.roomHeight / 2, 0); // Toward back wall
    this.group.add(dirLight.target);
    dirLight.castShadow = true;
    
    
    this.group.add(dirLight);
    dirLight.layers.enableAll();


    // === ADD A CEILING LIGHT to brighten front and center ===
const ceilingLight = new THREE.PointLight(0xffffff, 1.4, 25, 2);
ceilingLight.position.set(0, this.roomHeight - 0.2, 0); // Just under the ceiling
ceilingLight.castShadow = true;
ceilingLight.shadow.mapSize.width = 1024;
ceilingLight.shadow.mapSize.height = 1024;
ceilingLight.shadow.bias = -0.0001;
this.group.add(ceilingLight);
ceilingLight.layers.enableAll();


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

    this._loadAssets();
  }

  // ... All other methods of DinoRoom are unchanged ...
  // (async _loadAssets, _storeBoundingSizes, _updateScoreDisplay, etc.)
  async _loadAssets() {
    if (this._assetsPromise) return this._assetsPromise;
    this._assetsPromise = (async () => {
      const loadModel = (path, rotY = 0) =>
        new Promise((resolve) => {
          this.loader.load(path, (gltf) => {
            const model = gltf.scene;
            model.scale.setScalar(0.7);
            model.rotation.y = rotY;
            model.castShadow = true;
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
      this.activeDino.traverse(child => child.layers.enableAll());
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
    const rightWallX = 12 / 2 - 0.2;
    this.scoreMesh.position.set(rightWallX - 3, 6, -7.5);
    this.scoreMesh.rotation.y = -Math.PI / 2;
    this.group.add(this.scoreMesh);
    this.scoreMesh.layers.enableAll();
    this.displayedScore = score;
  }
  
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
        this.gameOverMessage.position.set(rightWallX - 3, 5, -5.5);
        this.gameOverMessage.rotation.y = -Math.PI / 2;
        this.group.add(this.gameOverMessage);
        this.gameOverMessage.layers.enableAll();
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

  update() {
    if (!this.font || !this.models.dino || !this.models.dino_duck) return;
    const delta = this.clock.getDelta();
    this._updateScoreDisplay();
    this._handleGameOverMessage(delta);
    const ducking = this.gameState.dino.ducking;
    const next = ducking ? this.models.dino_duck : this.models.dino;
    if (this.activeDino !== next) {
      this.group.remove(this.activeDino);
      this.activeDino = next;
      this.group.add(this.activeDino);
      this.activeDino.traverse(child => child.layers.enableAll());
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
      mesh.traverse(child => child.layers.enableAll());
    }
  }

  get mesh() {
    return this.group;
  }
}