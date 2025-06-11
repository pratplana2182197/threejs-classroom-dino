import * as THREE from 'three';

export class DinoRoomRenderer2D {
  constructor(mainRenderer, dinoRoom) {
    this.mainRenderer = mainRenderer;
    this.dinoRoom = dinoRoom;
    
    // Create render target for offscreen rendering
    this.renderTarget = new THREE.WebGLRenderTarget(512, 384, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType
    });
    
    // Create orthographic camera positioned at the window
    this.setupCamera();
    
    // Create texture from render target
    this.texture = this.renderTarget.texture;
    this.texture.needsUpdate = true;
  }
  
setupCamera() {
    // DinoRoom dimensions from the constructor
    const roomWidth = 12;
    const roomDepth = 20;
    const roomHeight = 11;
    
    // Calculate the actual render target aspect ratio
    const aspectRatio = this.renderTarget.width / this.renderTarget.height;
    
    // Define the game area we want to see
    // For a dino game, we want to see the full width (depth) of the running area
    // and enough height to see the dino, obstacles, and some sky
    const gameAreaDepth = roomDepth * 0.9; // Most of the room depth (running distance)
    const gameAreaHeight = roomHeight * 0.8; // More height to see obstacles and dino jumps
    
    // Calculate camera frustum based on aspect ratio
    // We want to fit the game area properly in our render target
    let left, right, top, bottom;
    
    if (aspectRatio > gameAreaDepth / gameAreaHeight) {
        // Render target is wider than game area - fit to height
        const halfHeight = gameAreaHeight / 2;
        top = halfHeight;
        bottom = -halfHeight;
        const halfWidth = halfHeight * aspectRatio;
        left = -halfWidth;
        right = halfWidth;
    } else {
        // Render target is taller than game area - fit to width
        const halfWidth = gameAreaDepth / 2;
        left = -halfWidth;
        right = halfWidth;
        const halfHeight = halfWidth / aspectRatio;
        top = halfHeight;
        bottom = -halfHeight;
    }
    
    this.camera = new THREE.OrthographicCamera(
        left,
        right,
        top,
        bottom,
        10,    // near - close enough to see through walls
        100   // far - far enough to see the entire room
    );
    
    // Position camera to get a side view of the dino game
    // DinoRoom is at position (30, 0, 0) in world space
    const roomCenterX = 30;
    const roomCenterY = roomHeight / 2;
    const roomCenterZ = 0;
    
    // Place camera to the side of the room for classic dino game side-view
    this.camera.position.set(
        roomCenterX - roomWidth/2 - 5,  // To the left of the room
        roomCenterY - 1,                // Slightly below center, focusing on ground level
        roomCenterZ                     // Centered on Z axis
    );
    
    // Look at the center of the game area (where the action happens)
    this.camera.lookAt(roomCenterX, roomCenterY - 1, roomCenterZ);
    
    // Optional: Add some debugging info
    console.log('Camera setup:', {
        frustum: { left, right, top, bottom },
        position: this.camera.position,
        aspectRatio: aspectRatio,
        renderTargetSize: { width: this.renderTarget.width, height: this.renderTarget.height }
    });
}
  
  render(deltaTime = 0) {
    if (!this.dinoRoom || !this.dinoRoom.font) {
      return; // Wait for assets to load
    }
    
    // Store original render target
    const originalRenderTarget = this.mainRenderer.getRenderTarget();
    
    // Set our render target
    this.mainRenderer.setRenderTarget(this.renderTarget);
    
    // Clear the render target
    this.mainRenderer.clear();
    
    // Store the original parent of the dino room mesh
    const originalParent = this.dinoRoom.mesh.parent;
    
    // Create a temporary scene for rendering just the dino room content
    const tempScene = new THREE.Scene();
    tempScene.background = new THREE.Color(0xf7f7f7); // Light gray background like Chrome dino game
    
    // Temporarily add the dino room to temp scene (without removing from original)
    if (originalParent) {
      originalParent.remove(this.dinoRoom.mesh);
    }
    tempScene.add(this.dinoRoom.mesh);
    
    // Render the dino room from the orthographic camera
    this.mainRenderer.render(tempScene, this.camera);
    
    // Remove from temp scene and restore to original parent
    tempScene.remove(this.dinoRoom.mesh);
    if (originalParent) {
      originalParent.add(this.dinoRoom.mesh);
    }
    
    // Restore original render target
    this.mainRenderer.setRenderTarget(originalRenderTarget);
    
    // Mark texture as needing update
    this.texture.needsUpdate = true;
  }
  
  getTexture() {
    return this.texture;
  }
  
  // Method to adjust camera view if needed
  adjustView(position, target) {
    if (position) {
      this.camera.position.copy(position);
    }
    if (target) {
      this.camera.lookAt(target);
    }
    this.camera.updateProjectionMatrix();
  }
  
  // Cleanup method
  dispose() {
    if (this.renderTarget) {
      this.renderTarget.dispose();
    }
    if (this.texture) {
      this.texture.dispose();
    }
  }
  
  // Method to resize render target if needed
  setSize(width, height) {
    this.renderTarget.setSize(width, height);
    
    // Update camera aspect ratio
    const aspectRatio = width / height;
    const frustumSize = Math.max(12, 20) * 0.8; // Based on room dimensions
    
    this.camera.left = -frustumSize * aspectRatio / 2;
    this.camera.right = frustumSize * aspectRatio / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();
  }
}