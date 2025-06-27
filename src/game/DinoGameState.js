export class DinoGameState {
  constructor() {
    // Game config
    this.gravity = -20;
    this.jumpVelocity = 10;
    this.groundY = 0;
    this.gameOver = true;

    // Dino state
    this.dino = {
      x: 0,
      y: this.groundY,
      vy: 0,
      width: 1,
      height: 1,
      duckWidth: 1,
      duckHeight: 1,
      isJumping: false,
      ducking: false
    };

    // Obstacles
    this.obstacles = [];
    this.obstacleDimensions = {
      cactus: { width: 0.6, height: 1.0 },
      bird: { width: 0.8, height: 0.5 }
    };

    // Game speed and timing
    this.speed = 5;
    this.spawnTimer = 0;
    this.spawnInterval = 2;

    // Score and time
    this._time = 0;
    this.score = 0;
    this.restartCooldown = 0;

    // Fixed timestep logic
    this._accumulator = 0;
    this._fixedStep = 1 / 60;
    

    // Debug rendering
    this.showCollisionBoxes = false;
    this.testing = false;

  }

  reset() {
    this.dino.y = this.groundY;
    this.dino.vy = 0;
    this.dino.isJumping = false;
    this.dino.ducking = false;
    this.obstacles = [];
    this._time = 0;
    this.spawnTimer = 0;
    this.score = 0;
    this.speed = 5;
    this.spawnInterval = 2;
    this._accumulator = 0;
    this.restartCooldown = 0;
    this.gameOver = false;
    if (this.testing) {
      this.spawnTestObstacles();
    }
    this.restartCooldown = 1.0;
  }

  setGameOver() {
    this.gameOver = true;
    this.restartCooldown = 1.0;
  }

  update(deltaTime) {
    this._accumulator += deltaTime;
    while (this._accumulator >= this._fixedStep) {
      this._updateFixed(this._fixedStep);
      this._accumulator -= this._fixedStep;
    }
  }

  _updateFixed(dt) {
    if (this.testing) return;

    this._time += dt;

    if (this.restartCooldown > 0) {
      this.restartCooldown -= dt;
    }

    if (this.gameOver) return;

    this.spawnTimer += dt;
    this.score += dt * 10;

    if (this.dino.isJumping) {
      this.dino.vy += this.gravity * dt;
      this.dino.y += this.dino.vy * dt;

      if (this.dino.y <= this.groundY) {
        this.dino.y = this.groundY;
        this.dino.vy = 0;
        this.dino.isJumping = false;
      }
    }

    this.obstacles.forEach(o => o.x -= this.speed * dt);
    this.obstacles = this.obstacles.filter(o => o.x > -10);

    const roomDepth = 20;
    const repeat = 1;
    this.floorOffset = (this.floorOffset || 0) - (this.speed * dt) / roomDepth * repeat;
    if (this.floorOffset < 0) {
      this.floorOffset += 1;
    }

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnObstacle();
      this.spawnTimer = 0;
      this.speed = Math.min(this.speed + 0.2, 15);
      this.spawnInterval = Math.max(0.4, this.spawnInterval * 0.98);
    }

    this.checkCollisions();
    
  }

  spawnObstacle() {
    const type = Math.random() < 0.7 ? 'cactus' : 'bird';
    const dim = this.obstacleDimensions[type];
    const y = type === 'cactus' ? this.groundY : this.groundY + 0.5;

    this.obstacles.push({
      x: 12,
      y,
      type,
      width: dim.width,
      height: dim.height
    });
  }

  jump() {
    if (!this.dino.isJumping && !this.gameOver) {
      this.dino.isJumping = true;
      this.dino.vy = this.jumpVelocity;
      this.dino.ducking = false;
    }
  }

  duck(isDucking) {
    if (!this.dino.isJumping && !this.gameOver) {
      this.dino.ducking = isDucking;
    }
  }

  boxesOverlap(box1, box2) {
    const M = 0.02;
    return (
      box1.x + M < box2.x + box2.depth - M &&
      box1.x + box1.depth - M > box2.x + M &&
      box1.y + M < box2.y + box2.height - M &&
      box1.y + box1.height - M > box2.y + M &&
      box1.z + M < box2.z + box2.width - M &&
      box1.z + box1.width - M > box2.z + M
    );
  }

  checkCollisions() {
    const dinoBoxes = this.getDinoCollisionBoxes();
    for (const obstacle of this.obstacles) {
      const obstacleBoxes = this.getObstacleCollisionBoxes(obstacle);
      for (const dinoBox of dinoBoxes) {
        for (const obstacleBox of obstacleBoxes) {
          if (this.boxesOverlap(dinoBox, obstacleBox)) {
            console.log(`Collision detected: Dino ${dinoBox.label} hit ${obstacle.type} ${obstacleBox.label}`);
            this.setGameOver();
            return;
          }
        }
      }
    }
  }


  renderCollisionBoxes(scene, THREE) {
    scene.children = scene.children.filter(c => !c.userData.isCollisionBox);
    if (!this.showCollisionBoxes) return;

    const allBoxes = this.getAllCollisionBoxes();

    const renderBox = (box, color) => {
      const geometry = new THREE.BoxGeometry(box.depth, box.height, box.width);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        wireframe: true
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        box.x + box.depth / 2,  // X axis ← depth
        box.y + box.height / 2,
        box.z + box.width / 2   // Z axis ← width
      );
      mesh.userData.isCollisionBox = true;
      scene.add(mesh);
    };

    allBoxes.dino.forEach(box => renderBox(box, 0x00ff00));
    allBoxes.obstacles.forEach(o => o.boxes.forEach(box => renderBox(box, 0xff0000)));
  }


    // Get collision boxes for the dino based on current state
  getDinoCollisionBoxes() {
    const dino = this.dino;

    if (dino.ducking) {
      return [
        {
          x: -0.35,
          y: dino.y + 0.4,
          z: dino.x +0.22,
          width: 0.7,
          height: 0.55,
          depth: 0.4,
          label: 'head'
        },
        {
          x: -0.35,
          y: dino.y,
          z: dino.x - 1.05,
          width: 1.3,
          height: 0.8,
          depth: 0.4,
          label: 'body'
        },
      ];
    } else {
      return [
        {
          x: -0.22,
          y: dino.y + 0.85,
          z: dino.x -0.07,
          width: 0.7,
          height: 0.6,
          depth: 0.3,
          label: 'head'
        },
        {
          x: -0.22,
          y: dino.y + 0.6,
          z: dino.x + 0.17,
          width: 0.2,
          height: 0.2,
          depth: 0.4,
          label: 'arms'
        },
        {
          x: -0.22,
          y: dino.y +0.5,
          z: dino.x - 0.4,
          width: 0.6,
          height: 0.4,
          depth: 0.4,
          label: 'body'
        },
        {
          x: -0.22,
          y: dino.y,
          z: dino.x - 0.41,
          width: 0.4,
          height: 0.4,
          depth: 0.4,
          label: 'legs'
        },
        {
          x: -0.22,
          y: dino.y + 0.3,
          z: dino.x - 0.83,
          width: 0.4,
          height: 0.7,
          depth: 0.3,
          label: 'tail'
        }
      ];
    }
  }

  getObstacleCollisionBoxes(obstacle) {
    const boxes = [];

    if (obstacle.type === 'cactus') {
      boxes.push(
        { x: -0.14, y: obstacle.y, z: obstacle.x - 0.13, width: 0.25, height: 1.4, depth: 0.3, label: 'trunk' },
        { x: -0.14, y: obstacle.y + 0.9, z: obstacle.x + 0.077, width: 0.4, height: 0.41, depth: 0.3, label: 'arm_right' },
        { x: -0.14, y: obstacle.y + 0.51, z: obstacle.x - 0.48, width: 0.4, height: 0.41, depth: 0.3, label: 'arm_left' }

      );
    } else if (obstacle.type === 'bird') {
      boxes.push(
        { x: -0.1, y: obstacle.y + 1.18, z: obstacle.x - 0.82, width: 0.6, height: 0.4, depth: 0.2, label: 'head' },
        { x: -0.1, y: obstacle.y + 0.8, z: obstacle.x - 0.22, width: 0.95, height: 0.4, depth: 0.15, label: 'body' }
      );
    }

    return boxes;
  }

  getAllCollisionBoxes() {
    const allBoxes = {
      dino: this.getDinoCollisionBoxes(),
      obstacles: []
    };

    this.obstacles.forEach(obstacle => {
      allBoxes.obstacles.push({
        obstacle: obstacle,
        boxes: this.getObstacleCollisionBoxes(obstacle)
      });
    });

    return allBoxes;
  }

  spawnTestObstacles() {
    const dinoX = this.dino.x;
    const y = this.groundY;

    this.obstacles.push(
      {
        x: dinoX + 3,
        y: y + 0.5,  // bird height
        type: 'bird',
        width: this.obstacleDimensions.bird.width,
        height: this.obstacleDimensions.bird.height
      },
      {
        x: dinoX + 5,
        y: y,
        type: 'cactus',
        width: this.obstacleDimensions.cactus.width,
        height: this.obstacleDimensions.cactus.height
      }
    );
  }

}
