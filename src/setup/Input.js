import * as THREE from 'three';
import {
  getLocalUVOnMesh,
  mapUVToMesh,
  startTeleportTransition,
  getClosestScreen
} from '../utils/utils.js';

export class InputHandler {
  constructor(world, getCurrentRoom) {
    this.world = world;
    this.getCurrentRoom = getCurrentRoom;
    this.lastTeleportOrigin = null;
    this.fromClassroom = false;
    this.origin = null;
    this.destination = null;
    this.onTeleportStart = null;
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  handleKeyDown(e) {
    const key = e.key.toLowerCase();

     if (e.code === 'Space' || e.code === 'ArrowUp') {
      this.world.gameState.gameOver && this.world.gameState.restartCooldown <= 0
        ? this.world.gameState.reset()
        : this.world.gameState.jump();
    }

    if (e.code === 'ArrowDown' && !this.world.gameState.gameOver) {
      this.world.gameState.dino.ducking = true;
    }

    if (key === 'n') {
      this.world.toggleSunlight(this.getCurrentRoom());
    }

    if (key === 'l') {
      this.world.toggleLights(this.getCurrentRoom());
    }

    if (e.code === 'KeyE') {
      const prompt = document.getElementById('teleportPrompt');
      if (prompt.style.display !== 'block') return;

      const camPos = this.world.controls.controls.object.position;
      const closestScreen = getClosestScreen(this.world.camera, this.world.screenMeshes);

      this.fromClassroom = this.getCurrentRoom() === 'classroom';
      this.origin = this.fromClassroom ? closestScreen : this.world.dinoCanvas;
      this.destination = this.fromClassroom ? this.world.dinoCanvas : this.lastTeleportOrigin || closestScreen;

      if (!this.origin || !this.destination) return;

      const offset = this.destination === this.world.dinoCanvas ? -0.2 : 0.2;
      const { u, v } = getLocalUVOnMesh(this.origin, camPos);
      const newWorldPos = mapUVToMesh(this.destination, u, v, offset);

      if (this.fromClassroom) {
        this.lastTeleportOrigin = this.origin;

        const viewCam = new THREE.PerspectiveCamera(50, 512 / 384, 0.1, 100);
        viewCam.position.copy(this.origin.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.6, 0)));
        viewCam.lookAt(new THREE.Vector3(-7.5, 1.2, 0));

        this.world.portalRendererClassroom.setScene(this.world.classroomScene);
        this.world.portalRendererClassroom.setCamera(viewCam);
        this.world.portalRendererClassroom.render(this.world.renderer);

        this.world.dinoCanvas.material.map = this.world.portalRendererClassroom.getTexture();
      }

      startTeleportTransition(this.world.controls, newWorldPos, 1.5);
      
      if (this.onTeleportStart) {
        this.onTeleportStart();
      }
    }
  }

  handleKeyUp(e) {
    if (e.code === 'ArrowDown') {
      this.world.gameState.dino.ducking = false;
    }
  }
}