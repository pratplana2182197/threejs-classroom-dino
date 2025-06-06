export class DinoGameState {
  constructor() {
    // Game config
    this.gravity = -20;
    this.jumpVelocity = 8;
    this.groundY = 0;

    // Dino state
    this.dino = {
      x: 0,
      y: this.groundY,
      vy: 0,
      width: 1,
      height: 1,
      isJumping: false
    };

    // Obstacles
    this.obstacles = []; // { x, y, type }

    // Game speed and timing
    this.speed = 5;
    this.spawnTimer = 0;
    this.spawnInterval = 2; // seconds

    // Internal timer
    this._time = 0;
  }

  reset() {
    this.dino.y = this.groundY;
    this.dino.vy = 0;
    this.dino.isJumping = false;
    this.obstacles = [];
    this._time = 0;
    this.spawnTimer = 0;
  }

  update(deltaTime) {
    this._time += deltaTime;
    this.spawnTimer += deltaTime;

    // Dino jump physics
    if (this.dino.isJumping) {
      this.dino.vy += this.gravity * deltaTime;
      this.dino.y += this.dino.vy * deltaTime;

      if (this.dino.y <= this.groundY) {
        this.dino.y = this.groundY;
        this.dino.vy = 0;
        this.dino.isJumping = false;
      }
    }

    // Move obstacles left
    this.obstacles.forEach((o) => (o.x -= this.speed * deltaTime));

    // Remove passed obstacles
    this.obstacles = this.obstacles.filter((o) => o.x > -10);

    // Spawn new obstacle
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnObstacle();
      this.spawnTimer = 0;
    }
  }

  spawnObstacle() {
    const type = Math.random() < 0.8 ? 'cactus' : 'bird';
    const y = type === 'cactus' ? this.groundY : this.groundY + 1;

    this.obstacles.push({
      x: 20,
      y,
      type
    });
  }

  jump() {
    if (!this.dino.isJumping) {
      this.dino.isJumping = true;
      this.dino.vy = this.jumpVelocity;
    }
  }
}
