import * as THREE from 'three';

const overlayScene = new THREE.Scene();
const overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const overlayMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0
});

const overlayQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), overlayMaterial);
overlayScene.add(overlayQuad);

// Add this at the top of utils.js
export const transitionState = {
  active: false,
  timer: 0,
  duration: 1.2,
  half: 0.6,
  phase: 'fadeIn',
  newPosition: null,
  controls: null
};

// This replaces teleportWithFlash()
export function startTeleportTransition(controls, newPosition, duration = 1.2) {
  transitionState.active = true;
  transitionState.timer = 0;
  transitionState.duration = duration;
  transitionState.half = duration / 2;
  transitionState.phase = 'fadeIn';
  transitionState.newPosition = newPosition;
  transitionState.controls = controls;
}

// Call this every frame from your main loop
export function updateTransitionOverlay(delta, renderer, scene, camera, onFinish = null) {
  if (!transitionState.active) return;

  transitionState.timer += delta;

  if (transitionState.phase === 'fadeIn') {
    const t = transitionState.timer / transitionState.half;
    overlayMaterial.opacity = Math.min(t, 1);
    if (t >= 1) {
      if (onFinish) onFinish();
      transitionState.controls.controls.object.position.copy(transitionState.newPosition);
      transitionState.phase = 'fadeOut';
      transitionState.timer = 0;
    }
  } else if (transitionState.phase === 'fadeOut') {
    const t = transitionState.timer / transitionState.half;
    overlayMaterial.opacity = 1 - Math.min(t, 1);
    if (t >= 1) {
      overlayMaterial.opacity = 0;
      transitionState.active = false;
      // if (onFinish) onFinish(); 
    }
  }

  renderer.autoClear = false;
  renderer.render(overlayScene, overlayCamera);
  renderer.autoClear = true;
}


export function getLocalUVOnMesh(mesh, worldPos) {
  const localPos = mesh.worldToLocal(worldPos.clone());

  const geom = mesh.geometry;
  if (!geom.boundingBox) geom.computeBoundingBox();

  const box = geom.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);

  const u = (localPos.x - box.min.x) / size.x;
  const v = (localPos.y - box.min.y) / size.y;

  return { u, v };
}



export function mapUVToMesh(mesh, u, v, offset) {
  const geom = mesh.geometry;
  if (!geom.boundingBox) geom.computeBoundingBox();

  const box = geom.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);

  const localX = box.min.x + u * size.x;
  const localY = box.min.y + v * size.y;
  const localZ = 0; // center of plane

  const localPos = new THREE.Vector3(localX, localY, localZ + offset);
  return mesh.localToWorld(localPos);
}


export function getClosestScreen(camera, screens) {
  if (!camera || !screens?.length) return null;

  let minDist = Infinity;
  let closest = null;

  const camPos = camera.getWorldPosition(new THREE.Vector3());

  for (const screen of screens) {
    const screenPos = screen.getWorldPosition(new THREE.Vector3());
    const dist = camPos.distanceTo(screenPos);
    if (dist < minDist) {
      minDist = dist;
      closest = screen;
    }
  }

  return closest;
}

export function clampCameraToBounds(camera, bounds) {
  const pos = camera.position;
  pos.x = THREE.MathUtils.clamp(pos.x, bounds.minX, bounds.maxX);
  pos.y = THREE.MathUtils.clamp(pos.y, bounds.minY, bounds.maxY);
  pos.z = THREE.MathUtils.clamp(pos.z, bounds.minZ, bounds.maxZ);
}


export function updateTeleportPrompt(camera, screenMeshes, currentRoom, dinoWindow = null) {
  const prompt = document.getElementById('teleportPrompt');
  if (!prompt) return;

  const cam = camera;
  const camPos = cam.position;
  const camDir = new THREE.Vector3();
  cam.getWorldDirection(camDir);

  const minDistance = 2;
  const minDot = 0.5;
  let message = null;

  if (currentRoom === 'classroom') {
    for (const screen of screenMeshes) {
      const screenPos = screen.getWorldPosition(new THREE.Vector3());
      const toScreen = screenPos.clone().sub(camPos);
      const distance = toScreen.length();
      const facing = camDir.dot(toScreen.clone().normalize());

      const correctSide = camPos.x < screenPos.x;
      const lookingRight = camDir.x > 0.2;

      if (distance < minDistance && facing > minDot && correctSide && lookingRight) {
        message = 'Press E to enter the game';
        break;
      }
    }
  } else if (currentRoom === 'dinoRoom' && dinoWindow) {
    const screenPos = dinoWindow.getWorldPosition(new THREE.Vector3());
    const toScreen = screenPos.clone().sub(camPos);
    const distance = toScreen.length();
    const facing = camDir.dot(toScreen.clone().normalize());

    const correctSide = camPos.x > screenPos.x;
    const lookingLeft = camDir.x < -0.2;

    if (distance < minDistance && facing > minDot && correctSide && lookingLeft) {
      message = 'Press E to return to the classroom';
    }
  }

  if (message) {
    prompt.innerText = message;
    prompt.style.display = 'block';
  } else {
    prompt.style.display = 'none';
  }
}