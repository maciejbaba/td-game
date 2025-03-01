// Game constants
const TILE_SIZE = 40;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 12;
const ENEMY_TYPES = {
  BASIC: { health: 100, speed: 0.5, reward: 10, color: '#8BC34A', size: 20 },
  FAST: { health: 60, speed: 1, reward: 15, color: '#CDDC39', size: 16 },
  TANK: { health: 300, speed: 0.25, reward: 25, color: '#4CAF50', size: 25 },
};
const TOWER_TYPES = {
  BASIC: {
    damage: 20,
    range: 150,
    fireRate: 1,
    cost: 50,
    color: '#2196F3',
    description: 'Basic tower with balanced stats.',
  },
  RAPID: {
    damage: 10,
    range: 120,
    fireRate: 3,
    cost: 100,
    color: '#FFC107',
    description: 'Rapid-fire tower with fast attack speed but lower damage.',
  },
  SNIPER: {
    damage: 100,
    range: 250,
    fireRate: 0.5,
    cost: 150,
    color: '#F44336',
    description: 'Long-range tower with high damage but slow attack speed.',
  },
};

// Game variables
let canvas, ctx;
let gameState = {
  money: 300,
  lives: 20,
  level: 1,
  wave: 0,
  maxWaves: 3,
  gameRunning: false,
  selectedTower: null,
  towers: [],
  enemies: [],
  projectiles: [],
  path: [],
  waveInterval: null,
  spawnCounter: 0,
  levelComplete: false,
};

// Level designs
const levels = [
  {
    path: [
      { x: 0, y: 5 },
      { x: 15, y: 5 },
      { x: 15, y: 2 },
      { x: 13, y: 2 },
      { x: 13, y: 7 },
      { x: 18, y: 7 },
      { x: 18, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 11 },
      { x: 19, y: 11 },
    ],
    waves: [
      { type: 'BASIC', count: 6, interval: 60 },
      { type: 'BASIC', count: 10, interval: 50 },
      { type: 'FAST', count: 8, interval: 40 },
    ],
  },
  {
    path: [
      { x: 0, y: 2 },
      { x: 5, y: 2 },
      { x: 5, y: 8 },
      { x: 10, y: 8 },
      { x: 10, y: 4 },
      { x: 15, y: 4 },
      { x: 15, y: 9 },
      { x: 19, y: 9 },
    ],
    waves: [
      { type: 'BASIC', count: 12, interval: 50 },
      { type: 'FAST', count: 10, interval: 40 },
      { type: 'TANK', count: 5, interval: 70 },
    ],
  },
  {
    path: [
      { x: 0, y: 6 },
      { x: 3, y: 6 },
      { x: 3, y: 2 },
      { x: 8, y: 2 },
      { x: 8, y: 9 },
      { x: 14, y: 9 },
      { x: 14, y: 4 },
      { x: 19, y: 4 },
    ],
    waves: [
      { type: 'BASIC', count: 15, interval: 40 },
      { type: 'FAST', count: 15, interval: 30 },
      { mixed: true, counts: { BASIC: 10, FAST: 8, TANK: 5 }, interval: 35 },
    ],
  },
];

// DOM elements
let levelInfoEl, moneyInfoEl, livesInfoEl, waveInfoEl, statusInfoEl;
let startButton, nextLevelButton, towerButtons, towerInfo;
let gameOverEl, finalLevelEl, restartButton;

// Initialize the game
window.onload = function () {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  // Get DOM elements
  levelInfoEl = document.getElementById('levelInfo');
  moneyInfoEl = document.getElementById('moneyInfo');
  livesInfoEl = document.getElementById('livesInfo');
  waveInfoEl = document.getElementById('waveInfo');
  statusInfoEl = document.getElementById('statusInfo');
  startButton = document.getElementById('startButton');
  nextLevelButton = document.getElementById('nextLevelButton');
  towerButtons = document.querySelectorAll('.towerButton');
  towerInfo = document.getElementById('towerInfo');
  gameOverEl = document.getElementById('gameOver');
  finalLevelEl = document.getElementById('finalLevel');
  restartButton = document.getElementById('restartButton');

  // Set up event listeners
  startButton.addEventListener('click', startWave);
  nextLevelButton.addEventListener('click', nextLevel);
  restartButton.addEventListener('click', restartGame);

  towerButtons.forEach((button) => {
    button.addEventListener('click', () => selectTower(button.id));
    button.addEventListener('mouseover', () => showTowerInfo(button.id));
  });

  canvas.addEventListener('click', handleCanvasClick);

  // Load the first level
  loadLevel(1);

  // Start the game loop
  requestAnimationFrame(gameLoop);
};

function loadLevel(levelNum) {
  if (levelNum > levels.length) {
    gameState.level = levels.length;
    showGameOver(true);
    return;
  }

  const level = levels[levelNum - 1];
  gameState.level = levelNum;
  gameState.wave = 0;
  gameState.maxWaves = level.waves.length;
  gameState.path = createPath(level.path);
  gameState.towers = [];
  gameState.enemies = [];
  gameState.projectiles = [];
  gameState.levelComplete = false;

  updateUI();
  setStatus(`Level ${levelNum} - Place your towers and press Start Wave!`);
}

function createPath(pathPoints) {
  const fullPath = [];

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const start = pathPoints[i];
    const end = pathPoints[i + 1];

    // Determine direction and distance
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 10; // Increase resolution

    for (let step = 0; step <= steps; step++) {
      const progress = steps === 0 ? 1 : step / steps;
      const x = start.x + dx * progress;
      const y = start.y + dy * progress;
      fullPath.push({ x, y });
    }
  }

  return fullPath;
}

function selectTower(towerId) {
  towerButtons.forEach((button) => button.classList.remove('selected'));
  document.getElementById(towerId).classList.add('selected');

  switch (towerId) {
    case 'basicTower':
      gameState.selectedTower = 'BASIC';
      break;
    case 'rapidTower':
      gameState.selectedTower = 'RAPID';
      break;
    case 'sniperTower':
      gameState.selectedTower = 'SNIPER';
      break;
    default:
      gameState.selectedTower = null;
  }

  updateUI();
}

function showTowerInfo(towerId) {
  let towerType;
  switch (towerId) {
    case 'basicTower':
      towerType = 'BASIC';
      break;
    case 'rapidTower':
      towerType = 'RAPID';
      break;
    case 'sniperTower':
      towerType = 'SNIPER';
      break;
    default:
      return;
  }

  const tower = TOWER_TYPES[towerType];
  towerInfo.textContent = `${
    towerType.charAt(0) + towerType.slice(1).toLowerCase()
  } Tower: ${tower.description} Damage: ${tower.damage}, Range: ${
    tower.range
  }, Fire Rate: ${tower.fireRate}/s`;
}

function handleCanvasClick(event) {
  if (!gameState.selectedTower) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Convert to grid coordinates
  const gridX = Math.floor(x / TILE_SIZE);
  const gridY = Math.floor(y / TILE_SIZE);

  // Check if position is valid
  if (!isValidTowerPosition(gridX, gridY)) {
    setStatus('You cannot place a tower on the path!');
    return;
  }

  // Check if we have enough money
  const towerCost = TOWER_TYPES[gameState.selectedTower].cost;
  if (gameState.money < towerCost) {
    setStatus(`Not enough money! You need $${towerCost}`);
    return;
  }

  // Place the tower
  gameState.towers.push({
    type: gameState.selectedTower,
    x: gridX * TILE_SIZE + TILE_SIZE / 2,
    y: gridY * TILE_SIZE + TILE_SIZE / 2,
    lastFired: 0,
    level: 1,
  });

  // Deduct money
  gameState.money -= towerCost;
  updateUI();

  setStatus(
    `Placed a ${
      gameState.selectedTower.charAt(0) +
      gameState.selectedTower.slice(1).toLowerCase()
    } Tower!`
  );
}

function isValidTowerPosition(gridX, gridY) {
  // Check grid boundaries
  if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
    return false;
  }

  // Check if on path
  const centerX = gridX * TILE_SIZE + TILE_SIZE / 2;
  const centerY = gridY * TILE_SIZE + TILE_SIZE / 2;

  // Check with a threshold since the path is continuous
  const threshold = TILE_SIZE * 0.8;

  for (const point of gameState.path) {
    const pathX = point.x * TILE_SIZE + TILE_SIZE / 2;
    const pathY = point.y * TILE_SIZE + TILE_SIZE / 2;

    const distance = Math.sqrt((centerX - pathX) ** 2 + (centerY - pathY) ** 2);
    if (distance < threshold) {
      return false;
    }
  }

  // Check if another tower is already there
  for (const tower of gameState.towers) {
    const towerGridX = Math.floor(tower.x / TILE_SIZE);
    const towerGridY = Math.floor(tower.y / TILE_SIZE);

    if (towerGridX === gridX && towerGridY === gridY) {
      return false;
    }
  }

  return true;
}

function startWave() {
  if (gameState.gameRunning || gameState.wave >= gameState.maxWaves) {
    return;
  }

  gameState.wave++;
  gameState.gameRunning = true;
  gameState.enemies = [];
  gameState.spawnCounter = 0;

  const currentLevel = levels[gameState.level - 1];
  const currentWave = currentLevel.waves[gameState.wave - 1];

  startButton.disabled = true;
  updateUI();

  setStatus(`Wave ${gameState.wave}/${gameState.maxWaves} started!`);

  // Clear any existing interval
  if (gameState.waveInterval) {
    clearInterval(gameState.waveInterval);
  }

  // Set up enemy spawning
  if (currentWave.mixed) {
    // Handle mixed wave
    const enemyTypes = Object.keys(currentWave.counts);
    const totalEnemies = enemyTypes.reduce(
      (sum, type) => sum + currentWave.counts[type],
      0
    );
    let enemiesSpawned = 0;

    gameState.waveInterval = setInterval(() => {
      if (enemiesSpawned >= totalEnemies) {
        clearInterval(gameState.waveInterval);
        return;
      }

      // Determine which enemy type to spawn next
      let typeToSpawn = enemyTypes[0];
      for (const type of enemyTypes) {
        if (currentWave.counts[type] > 0) {
          typeToSpawn = type;
          currentWave.counts[type]--;
          break;
        }
      }

      spawnEnemy(typeToSpawn);
      enemiesSpawned++;
    }, currentWave.interval);
  } else {
    // Handle single-type wave
    gameState.waveInterval = setInterval(() => {
      if (gameState.spawnCounter >= currentWave.count) {
        clearInterval(gameState.waveInterval);
        return;
      }

      spawnEnemy(currentWave.type);
      gameState.spawnCounter++;
    }, currentWave.interval);
  }
}

function spawnEnemy(type) {
  const enemyType = ENEMY_TYPES[type];

  // Start position is the first point in the path
  const startPoint = gameState.path[0];
  const x = startPoint.x * TILE_SIZE + TILE_SIZE / 2;
  const y = startPoint.y * TILE_SIZE + TILE_SIZE / 2;

  gameState.enemies.push({
    type: type,
    x: x,
    y: y,
    health: enemyType.health,
    maxHealth: enemyType.health,
    speed: enemyType.speed,
    reward: enemyType.reward,
    pathIndex: 0,
    size: enemyType.size,
  });

  // Debug info to help track enemy spawn
  console.log(`Spawned ${type} enemy at position (${x}, ${y})`);
}

function gameLoop(timestamp) {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the grid
  drawGrid();

  // Draw the path
  drawPath();

  // Update and draw towers
  updateTowers(timestamp);
  drawTowers();

  // Update and draw enemies
  updateEnemies();
  drawEnemies();

  // Update and draw projectiles
  updateProjectiles();
  drawProjectiles();

  // Check if wave is complete
  checkWaveComplete();

  // Request next frame
  requestAnimationFrame(gameLoop);
}

function drawGrid() {
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;

  // Draw vertical lines
  for (let x = 0; x <= GRID_WIDTH; x++) {
    ctx.beginPath();
    ctx.moveTo(x * TILE_SIZE, 0);
    ctx.lineTo(x * TILE_SIZE, GRID_HEIGHT * TILE_SIZE);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y <= GRID_HEIGHT; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * TILE_SIZE);
    ctx.lineTo(GRID_WIDTH * TILE_SIZE, y * TILE_SIZE);
    ctx.stroke();
  }
}

function drawPath() {
  // Draw path background
  ctx.fillStyle = '#795548';

  for (const point of gameState.path) {
    ctx.fillRect(
      point.x * TILE_SIZE,
      point.y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
  }

  // Draw path border
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 2;

  ctx.beginPath();
  const startPoint = gameState.path[0];
  ctx.moveTo(
    startPoint.x * TILE_SIZE + TILE_SIZE / 2,
    startPoint.y * TILE_SIZE + TILE_SIZE / 2
  );

  for (let i = 1; i < gameState.path.length; i++) {
    const point = gameState.path[i];
    ctx.lineTo(
      point.x * TILE_SIZE + TILE_SIZE / 2,
      point.y * TILE_SIZE + TILE_SIZE / 2
    );
  }

  ctx.stroke();

  // Draw start and end indicators
  const endPoint = gameState.path[gameState.path.length - 1];

  // Start point
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.moveTo((startPoint.x) * TILE_SIZE, startPoint.y * TILE_SIZE);
  ctx.lineTo((startPoint.x + 1) * TILE_SIZE, (startPoint.y + 0.5) * TILE_SIZE);
  ctx.lineTo((startPoint.x) * TILE_SIZE, (startPoint.y + 1) * TILE_SIZE);
  ctx.fill();

  // End point
  ctx.fillStyle = '#F44336';
  ctx.fillRect(
    endPoint.x * TILE_SIZE + TILE_SIZE / 4,
    endPoint.y * TILE_SIZE + TILE_SIZE / 4,
    TILE_SIZE / 2,
    TILE_SIZE / 2
  );
}

function updateTowers(timestamp) {
  for (const tower of gameState.towers) {
    const towerType = TOWER_TYPES[tower.type];
    const fireInterval = 1000 / towerType.fireRate;

    // Check if tower can fire
    if (timestamp - tower.lastFired >= fireInterval) {
      // Find closest enemy in range
      let closestEnemy = null;
      let closestDistance = towerType.range;

      for (const enemy of gameState.enemies) {
        const distance = Math.sqrt(
          (tower.x - enemy.x) ** 2 + (tower.y - enemy.y) ** 2
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      }

      // Fire at closest enemy
      if (closestEnemy) {
        const angle = Math.atan2(
          closestEnemy.y - tower.y,
          closestEnemy.x - tower.x
        );

        gameState.projectiles.push({
          x: tower.x,
          y: tower.y,
          targetX: closestEnemy.x,
          targetY: closestEnemy.y,
          target: closestEnemy,
          speed: 5,
          damage: towerType.damage,
          color: towerType.color,
        });

        tower.lastFired = timestamp;
      }
    }
  }
}

function drawTowers() {
  for (const tower of gameState.towers) {
    const towerType = TOWER_TYPES[tower.type];

    // Draw tower base
    ctx.fillStyle = '#9E9E9E';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, TILE_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw tower top
    ctx.fillStyle = towerType.color;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, TILE_SIZE / 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw range indicator on hover
    const mouseX = lastMouseX || 0;
    const mouseY = lastMouseY || 0;
    const distance = Math.sqrt(
      (tower.x - mouseX) ** 2 + (tower.y - mouseY) ** 2
    );

    if (distance < TILE_SIZE / 2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, towerType.range, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Track mouse position for hover effects
let lastMouseX = null;
let lastMouseY = null;

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  lastMouseX = event.clientX - rect.left;
  lastMouseY = event.clientY - rect.top;
});

canvas.addEventListener('mouseout', () => {
  lastMouseX = null;
  lastMouseY = null;
});

function updateEnemies() {
  const deadEnemies = [];
  const reachedEndEnemies = [];

  for (let i = 0; i < gameState.enemies.length; i++) {
    const enemy = gameState.enemies[i];

    // Check if enemy is dead
    if (enemy.health <= 0) {
      deadEnemies.push(i);
      gameState.money += enemy.reward;
      continue;
    }

    // Move enemy along the path
    if (enemy.pathIndex < gameState.path.length - 1) {
      const currentPoint = gameState.path[enemy.pathIndex];
      const nextPoint = gameState.path[enemy.pathIndex + 1];

      const currentX = currentPoint.x * TILE_SIZE + TILE_SIZE / 2;
      const currentY = currentPoint.y * TILE_SIZE + TILE_SIZE / 2;
      const nextX = nextPoint.x * TILE_SIZE + TILE_SIZE / 2;
      const nextY = nextPoint.y * TILE_SIZE + TILE_SIZE / 2;

      const dx = nextX - currentX;
      const dy = nextY - currentY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        // Ensure we don't divide by zero
        // Calculate normalized direction
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Move enemy
        enemy.x += dirX * enemy.speed;
        enemy.y += dirY * enemy.speed;

        // Check if enemy reached the next point
        const newDx = nextX - enemy.x;
        const newDy = nextY - enemy.y;
        const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);

        // Use a more reliable threshold for determining if the point was reached
        if (newDistance < enemy.speed * 1.5) {
          enemy.pathIndex++;
        }
      } else {
        // If points are identical, just move to the next point
        enemy.pathIndex++;
      }
    } else if (enemy.pathIndex === gameState.path.length - 1) {
      // Enemy reached the end
      reachedEndEnemies.push(i);
      gameState.lives--;
    }
  }

  // Remove dead enemies
  for (let i = deadEnemies.length - 1; i >= 0; i--) {
    gameState.enemies.splice(deadEnemies[i], 1);
  }

  // Remove enemies that reached the end
  for (let i = reachedEndEnemies.length - 1; i >= 0; i--) {
    gameState.enemies.splice(reachedEndEnemies[i], 1);
  }

  // Check if game over
  if (gameState.lives <= 0) {
    showGameOver(false);
  }

  updateUI();
}

function drawEnemies() {
  for (const enemy of gameState.enemies) {
    const enemyType = ENEMY_TYPES[enemy.type];

    // Draw enemy body
    ctx.fillStyle = enemyType.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw enemy outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Draw health bar
    const healthPercent = enemy.health / enemy.maxHealth;
    const barWidth = enemy.size;
    const barHeight = 4;

    ctx.fillStyle = '#E53935';
    ctx.fillRect(
      enemy.x - barWidth / 2,
      enemy.y - enemy.size / 2 - 10,
      barWidth,
      barHeight
    );

    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(
      enemy.x - barWidth / 2,
      enemy.y - enemy.size / 2 - 10,
      barWidth * healthPercent,
      barHeight
    );
  }
}

function updateProjectiles() {
  const deadProjectiles = [];

  for (let i = 0; i < gameState.projectiles.length; i++) {
    const projectile = gameState.projectiles[i];

    // Calculate direction to target
    const dx = projectile.targetX - projectile.x;
    const dy = projectile.targetY - projectile.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if projectile hit target
    if (distance < 5) {
      deadProjectiles.push(i);

      // Deal damage to target if it still exists
      if (projectile.target && gameState.enemies.includes(projectile.target)) {
        projectile.target.health -= projectile.damage;
      }
      continue;
    }

    // Move projectile towards target
    const dirX = dx / distance;
    const dirY = dy / distance;

    projectile.x += dirX * projectile.speed;
    projectile.y += dirY * projectile.speed;

    // Update target position (enemy may have moved)
    if (projectile.target && gameState.enemies.includes(projectile.target)) {
      projectile.targetX = projectile.target.x;
      projectile.targetY = projectile.target.y;
    }
  }

  // Remove dead projectiles
  for (let i = deadProjectiles.length - 1; i >= 0; i--) {
    gameState.projectiles.splice(deadProjectiles[i], 1);
  }
}

function drawProjectiles() {
  for (const projectile of gameState.projectiles) {
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw trail
    ctx.strokeStyle = projectile.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(projectile.x, projectile.y);

    const dx = projectile.targetX - projectile.x;
    const dy = projectile.targetY - projectile.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / distance;
    const dirY = dy / distance;

    ctx.lineTo(projectile.x - dirX * 10, projectile.y - dirY * 10);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function checkWaveComplete() {
  if (!gameState.gameRunning) {
    return;
  }

  // Check if all enemies are defeated and spawning is complete
  const currentLevel = levels[gameState.level - 1];
  const currentWave = currentLevel.waves[gameState.wave - 1];

  const allEnemiesSpawned = currentWave.mixed
    ? Object.values(currentWave.counts).every((count) => count === 0)
    : gameState.spawnCounter >= currentWave.count;

  if (gameState.enemies.length === 0 && allEnemiesSpawned) {
    gameState.gameRunning = false;

    // Check if this was the last wave
    if (gameState.wave >= gameState.maxWaves) {
      gameState.levelComplete = true;
      nextLevelButton.style.display = 'block';
      setStatus(
        `Level ${gameState.level} complete! Click Next Level to continue.`
      );

      // Give bonus money
      gameState.money += 100 + gameState.level * 50;
      updateUI();
    } else {
      startButton.disabled = false;
      setStatus(
        `Wave ${gameState.wave}/${gameState.maxWaves} complete! Click Start Wave for the next wave.`
      );
    }
  }
}

function nextLevel() {
  if (gameState.levelComplete) {
    loadLevel(gameState.level + 1);
    nextLevelButton.style.display = 'none';
  }
}

function updateUI() {
  levelInfoEl.textContent = gameState.level;
  moneyInfoEl.textContent = gameState.money;
  livesInfoEl.textContent = gameState.lives;
  waveInfoEl.textContent = `${gameState.wave}/${gameState.maxWaves}`;

  // Update tower buttons
  towerButtons.forEach((button) => {
    const cost = parseInt(button.dataset.cost);
    button.disabled = gameState.money < cost;
  });
}

function setStatus(message) {
  statusInfoEl.textContent = message;
}

function showGameOver(victory) {
  gameState.gameRunning = false;

  if (gameState.waveInterval) {
    clearInterval(gameState.waveInterval);
    gameState.waveInterval = null;
  }

  gameOverEl.style.display = 'block';
  finalLevelEl.textContent = gameState.level;

  if (victory) {
    document.querySelector('#gameOver h2').textContent = 'Victory!';
    document.querySelector('#gameOver p').textContent =
      'You completed all levels!';
  }
}

function restartGame() {
  gameOverEl.style.display = 'none';
  gameState.money = 300;
  gameState.lives = 20;
  loadLevel(1);
  startButton.disabled = false;
  nextLevelButton.style.display = 'none';
}
