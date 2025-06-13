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
export function updateTransitionOverlay(delta, renderer, scene, camera) {
  if (!transitionState.active) return;

  transitionState.timer += delta;

  if (transitionState.phase === 'fadeIn') {
    const t = transitionState.timer / transitionState.half;
    overlayMaterial.opacity = Math.min(t, 1);
    if (t >= 1) {
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

