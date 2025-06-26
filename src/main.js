import './style.css';
import { World } from './setup/World.js';
import { InputHandler } from './setup/Input.js';
import { updateTransitionOverlay, clampCameraToBounds, updateTeleportPrompt } from './utils/utils.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';


let world, inputHandler, stats;
let currentRoom = 'classroom';

const CLASSROOM_BOUNDS = { minX: -7.2, maxX: 7.2, minY: 0.8, maxY: 5.8, minZ: -6.2, maxZ: 6.2 };
const DINOROOM_BOUNDS = { minX: -5.5, maxX: 5.5, minY: 0.9, maxY: 10.8, minZ: -9.5, maxZ: 9.5 };

init().then(animate);

async function init() {
  world = new World();
  await world.initialize();
  
  inputHandler = new InputHandler(world, () => currentRoom);
  inputHandler.setupEventListeners();

  stats = new Stats();
  document.getElementById('stats-box').appendChild(stats.dom);
}

function animate() {
  stats.begin();
  requestAnimationFrame(animate);

  const delta = world.clock.getDelta();

  world.controls.update();
  world.gameState.update(delta);
  world.dinoRoom.update();

  updateTeleportPrompt(world.camera, world.screenMeshes, currentRoom, world.dinoCanvas);
  world.portalRendererDino.render(world.renderer);

  clampCameraToBounds(world.camera, currentRoom === 'classroom' ? CLASSROOM_BOUNDS : DINOROOM_BOUNDS);

  const activeScene = currentRoom === 'classroom' ? world.classroomScene : world.dinoScene;
  world.gameState.renderCollisionBoxes(world.dinoScene, world.THREE);
  world.renderer.render(activeScene, world.camera);

  updateTransitionOverlay(delta, world.renderer, activeScene, world.camera, () => {
    currentRoom = inputHandler.fromClassroom ? 'dinoRoom' : 'classroom';

    world.controls.enable(currentRoom === 'classroom' ? world.classroomScene : world.dinoScene);

    if (currentRoom === 'classroom') {
      world.dinoRoom.dirLight.position.set(world.dinoRoom.roomWidth / 2 + 4, world.dinoRoom.roomHeight / 2, 0);
      world.dinoRoom.dirLight.target.position.set(world.dinoRoom.roomWidth + 10, world.dinoRoom.roomHeight / 2, 0);
      world.dinoRoom.backWall.material.roughness = 0.2;
    } else {
      world.dinoRoom.dirLight.position.set(-world.dinoRoom.roomWidth / 2, world.dinoRoom.roomHeight - 2, 0);
      world.dinoRoom.dirLight.target.position.set(0, world.dinoRoom.roomHeight / 2, 0);
      world.dinoRoom.backWall.material.roughness = 1;
    }

  });

  stats.end();
}