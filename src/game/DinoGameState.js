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

    // Fixed timestep logic
    this._accumulator = 0;
    this._fixedStep = 1 / 60; // 60 updates per second
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
    this.gameOver = false;
  }

  update(deltaTime) {
    this._accumulator += deltaTime;
    while (this._accumulator >= this._fixedStep) {
      this._updateFixed(this._fixedStep);
      this._accumulator -= this._fixedStep;
    }
  }

  _updateFixed(dt) {
    this._time += dt;
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

    this.obstacles.forEach((o) => o.x -= this.speed * dt);
    this.obstacles = this.obstacles.filter((o) => o.x > -10);

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnObstacle();
      this.spawnTimer = 0;
      this.speed = Math.min(this.speed + 0.1, 15);
      this.spawnInterval = Math.max(0.6, this.spawnInterval * 0.99);
    }

    this.checkCollisions();
  }

  spawnObstacle() {
    const type = Math.random() < 0.7 ? 'cactus' : 'bird';
    const dimensions = this.obstacleDimensions[type];
    const y = type === 'cactus' ? this.groundY : this.groundY + 0.5;

    this.obstacles.push({
      x: 12,
      y,
      type,
      width: dimensions.width,
      height: dimensions.height,
      yOffset: type === 'bird' ? dimensions.height * 0.5 : 0
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

  checkCollisions() {
    const COLLISION_MARGIN = 0.1;

    const dino = this.dino;
    const dinoWidth = dino.ducking ? dino.duckWidth : dino.width;
    const dinoHeight = dino.ducking ? dino.duckHeight : dino.height;

    const dinoLeft = dino.x + COLLISION_MARGIN;
    const dinoRight = dinoLeft + dinoWidth - 2 * COLLISION_MARGIN;
    const dinoBottom = dino.y + (dino.ducking ? -0.7 : 0) + COLLISION_MARGIN;
    const dinoTop = dinoBottom + dinoHeight - 2 * COLLISION_MARGIN;

    for (const obstacle of this.obstacles) {
      const isBird = obstacle.type === 'bird';
      const obBottom = obstacle.y + (isBird ? obstacle.height * 0.5 : 0) + COLLISION_MARGIN;
      const obHeight = obstacle.height * (isBird ? 0.5 : 1);
      const obTop = obBottom + obHeight - 2 * COLLISION_MARGIN;
      const obLeft = obstacle.x + COLLISION_MARGIN;
      const obRight = obLeft + obstacle.width - 2 * COLLISION_MARGIN;

      if (
        dinoRight > obLeft &&
        dinoLeft < obRight &&
        dinoTop > obBottom &&
        dinoBottom < obTop
      ) {
        this.gameOver = true;
        return;
      }
    }
  }
}
