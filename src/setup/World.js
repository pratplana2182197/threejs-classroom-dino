import * as THREE from 'three';
import { FirstPersonControls } from '../controls/FirstPersonControls.js';
import { loadClassroom } from '../scenes/Classroom.js';
import { DinoGameState } from '../game/DinoGameState.js';
import { DinoRoom } from '../scenes/DinoRoom.js';
import { PortalRenderer2D } from '../render/PortalRenderer2D.js';

export class World {
  constructor() {
    this.THREE = THREE;
    this.clock = new THREE.Clock();
    this.lightsOn = true;
    this.classroomScene = null;
    this.dinoScene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.portalRendererDino = null;
    this.portalRendererClassroom = null;
    this.gameState = null;
    this.dinoRoom = null;
    this.dinoCanvas = null;
    this.screenMeshes = null;
    this.dinoCamera = null;
    this.sunlight = null;
    this.sunMesh = null;
    this.ceilingLights = null;
    this.lightPanelMaterials = null;
    this.windowMeshes = null;
  }

  async initialize() {
    // Scenes
    this.classroomScene = new THREE.Scene();
    this.classroomScene.background = new THREE.Color(0xbfd1e5);

    this.dinoScene = new THREE.Scene();
    this.dinoScene.background = new THREE.Color(0xf0f0f0);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(2, 2, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.controls = new FirstPersonControls(this.camera, document.body);
    this.controls.enable(this.classroomScene);

    // Game
    this.gameState = new DinoGameState();
    this.dinoRoom = new DinoRoom(this.gameState);
    this.dinoScene.add(this.dinoRoom.mesh);

    // Dino camera
    const roomWidth = 12, roomHeight = 11, roomDepth = 20;
    const aspect = 512 / 384;

    const hw = roomDepth / 2;
    const hh = roomDepth / 2 / aspect;

    this.dinoCamera = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 10, 100);
    this.dinoCamera.position.set(-roomWidth / 2 - 5, roomHeight / 2 - 1, 0);
    this.dinoCamera.lookAt(0, roomHeight / 2 - 1, 0);
    this.dinoCamera.up.set(0, 1, 0);

    // Portals
    this.portalRendererDino = new PortalRenderer2D();
    this.portalRendererDino.setScene(this.dinoScene);
    this.portalRendererDino.setCamera(this.dinoCamera);

    this.portalRendererClassroom = new PortalRenderer2D();

    await this.dinoRoom._loadAssets();
    this.portalRendererDino.render(this.renderer);

    const {
      screenRefs, sunlight, sunMesh, ceilingLights,
      lightPanelMaterials, windowMeshes
    } = await loadClassroom(this.classroomScene, this.gameState, this.portalRendererDino.getTexture());

    this.screenMeshes = screenRefs;
    this.sunlight = sunlight;
    this.sunMesh = sunMesh;
    this.ceilingLights = ceilingLights;
    this.lightPanelMaterials = lightPanelMaterials;
    this.windowMeshes = windowMeshes;
    this.dinoCanvas = this.dinoRoom.mesh.getObjectByName('dinoCanvas');


    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  toggleSunlight(currentRoom) {
    const isOn = this.sunlight.intensity > 0;
    this.sunlight.intensity = isOn ? 0 : 5; 
    this.sunMesh.visible = !isOn;

    this.windowMeshes.forEach(mesh => {
      const mat = mesh.material;
      if (!mat) return;
      mat.color.set(!isOn ? 0xffffff : 0xaaaaaa);
      mat.roughness = !isOn ? 0.5 : 1;
    });

    if (currentRoom === 'dinoRoom') {
      this.portalRendererClassroom.render(this.renderer);
    }
  }

  toggleLights(currentRoom) {
    this.lightsOn = !this.lightsOn;
    this.ceilingLights.forEach(l => l.intensity = this.lightsOn ? 12 : 0);
    this.lightPanelMaterials.forEach(m => m.emissiveIntensity = this.lightsOn ? 0.8 : 0.01);

    if (currentRoom === 'dinoRoom') {
      this.portalRendererClassroom.render(this.renderer);
    }
  }
}