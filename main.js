// Game Configuration
const CONFIG = {
    // Canvas dimensions
    canvasWidth: 1200,
    canvasHeight: 800,
    
    // Player settings
    playerRadius: 16,
    playerSpeed: 220,
    playerHealth: 3,
    playerInvulnerabilityTime: 800, // in milliseconds
    
    // Enemy settings
    enemySpawnInterval: 2000, // in milliseconds
    enemySpawnMinDistance: 150, // minimum distance from player in pixels
    enemyContactDamageCooldown: 700, // in milliseconds
    
    // Assassin settings
    assassin: {
        radius: 14,
        speed: 200,
        health: 1
    },
    
    // Shooter settings
    shooter: {
        radius: 14,
        telegraphTime: 350, // in milliseconds
        fireInterval: 2000, // in milliseconds
        bulletSpeed: 400,
        bulletRadius: 4,
        bulletLifetime: 2500, // in milliseconds
        bulletSpread: 4 // in degrees
    },
    
    // Tank settings
    tank: {
        radius: 20,
        speed: 120,
        health: 3,
        knockback: 8, // in pixels
        flashTime: 100 // in milliseconds
    },
    
    // Weapon settings
    machineGunFireRate: 500, // in milliseconds
    pistolFireRate: 1000, // in milliseconds
    machineGunAmmo: 30,
    bulletSpeed: 600,
    bulletRadius: 4,
    
    // Game states
    states: {
        BOOT: 'BOOT',
        MENU: 'MENU',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        UPGRADE_PICK: 'UPGRADE_PICK',
        GAME_OVER: 'GAME_OVER'
    }
};

// Game state
let gameState = {
    currentState: CONFIG.states.PLAYING,
    player: null,
    enemies: [],
    bullets: [],
    enemyBullets: [], // Track enemy bullets separately
    score: 0,
    lastEnemySpawnTime: 0,
    lastFrameTime: 0,
    deltaTime: 0
};

// Input Manager
class InputManager {
    constructor() {
        this.moveVector = { x: 0, y: 0 };
        this.mousePosition = { x: 0, y: 0 };
        this.fire = false;
        this.pickup = false;
        this.switchWeapon = false;
        
        // Set up event listeners
        this.setupKeyboardListeners();
        this.setupMouseListeners();
    }
    
    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        window.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }
    
    setupMouseListeners() {
        const canvas = document.getElementById('game-canvas');
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mousePosition.x = e.clientX - rect.left;
            this.mousePosition.y = e.clientY - rect.top;
        });
        
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button
                this.fire = true;
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // Left mouse button
                this.fire = false;
            }
        });
    }
    
    handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.moveVector.y = -1;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.moveVector.y = 1;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.moveVector.x = -1;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.moveVector.x = 1;
                break;
            case 'r':
            case 'R':
                this.switchWeapon = true;
                break;
            case 'Enter':
                if (gameState.currentState === CONFIG.states.GAME_OVER) {
                    restartGame();
                }
                break;
        }
    }
    
    handleKeyUp(e) {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.moveVector.y === -1) this.moveVector.y = 0;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.moveVector.y === 1) this.moveVector.y = 0;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (this.moveVector.x === -1) this.moveVector.x = 0;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.moveVector.x === 1) this.moveVector.x = 0;
                break;
            case 'r':
            case 'R':
                this.switchWeapon = false;
                break;
        }
    }
    
    reset() {
        this.moveVector = { x: 0, y: 0 };
        this.fire = false;
        this.pickup = false;
        this.switchWeapon = false;
    }
}

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.playerRadius;
        this.speed = CONFIG.playerSpeed;
        this.health = CONFIG.playerHealth;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.currentWeapon = 'Machine Gun';
        this.machineGunAmmo = CONFIG.machineGunAmmo;
        this.lastFireTime = 0;
        
        // Load player image
        this.image = new Image();
        this.image.src = 'assets/player.svg';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }
    
    update(dt, inputManager) {
        // Update position based on input
        const normalizedVector = normalizeVector(inputManager.moveVector);
        this.x += normalizedVector.x * this.speed * dt;
        this.y += normalizedVector.y * this.speed * dt;
        
        // Keep player within bounds
        this.x = Math.max(this.radius, Math.min(CONFIG.canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CONFIG.canvasHeight - this.radius, this.y));
        
        // Update invulnerability
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= dt * 1000;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
            }
        }
        
        // Handle weapon switch
        if (inputManager.switchWeapon) {
            this.switchWeapon();
            inputManager.switchWeapon = false;
        }
        
        // Handle firing
        if (inputManager.fire) {
            this.tryToFire(inputManager.mousePosition);
        }
    }
    
    switchWeapon() {
        if (this.currentWeapon === 'Machine Gun') {
            this.currentWeapon = 'Pistol';
            playSfx('switch');
            showMessage('Switch: Pistol');
        } else {
            this.currentWeapon = 'Machine Gun';
            playSfx('switch');
            showMessage('Switch: Machine Gun');
        }
    }
    
    tryToFire(targetPosition) {
        const currentTime = Date.now();
        const fireRate = this.currentWeapon === 'Machine Gun' ? CONFIG.machineGunFireRate : CONFIG.pistolFireRate;
        
        if (currentTime - this.lastFireTime >= fireRate) {
            if (this.currentWeapon === 'Machine Gun' && this.machineGunAmmo <= 0) {
                // Out of ammo, switch to pistol
                this.currentWeapon = 'Pistol';
                showMessage('Out of ammo! Switched to Pistol');
                return;
            }
            
            // Calculate direction
            const dx = targetPosition.x - this.x;
            const dy = targetPosition.y - this.y;
            const direction = normalizeVector({ x: dx, y: dy });
            
            // Create bullet
            gameState.bullets.push(new Bullet(
                this.x + direction.x * (this.radius + 5),
                this.y + direction.y * (this.radius + 5),
                direction.x,
                direction.y
            ));
            
            // Update ammo
            if (this.currentWeapon === 'Machine Gun') {
                this.machineGunAmmo--;
            }
            
            // Update last fire time
            this.lastFireTime = currentTime;
            
            // Play sound
            playSfx('shoot');
        }
    }
    
    takeDamage() {
        if (!this.isInvulnerable) {
            this.health--;
            this.isInvulnerable = true;
            this.invulnerabilityTimer = CONFIG.playerInvulnerabilityTime;
            
            playSfx('hit');
            
            if (this.health <= 0) {
                gameState.currentState = CONFIG.states.GAME_OVER;
                playSfx('death');
                showGameOver();
            }
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        // Draw player (flashing if invulnerable)
        if (!this.isInvulnerable || Math.floor(Date.now() / 100) % 2 === 0) {
            if (this.imageLoaded) {
                // Draw the image if loaded
                ctx.drawImage(this.image, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            } else {
                // Fallback to circle
                ctx.fillStyle = 'blue';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}

// Base Enemy class
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.type = 'enemy';
        this.lastDamageTime = 0;
    }
    
    update(dt) {
        // Base update method to be overridden
    }
    
    draw(ctx) {
        // Base draw method to be overridden
    }
    
    drawTriangle(ctx, angle, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        
        // Calculate triangle points
        const x1 = this.x + Math.cos(angle) * this.radius;
        const y1 = this.y + Math.sin(angle) * this.radius;
        const x2 = this.x + Math.cos(angle + 2.5) * this.radius;
        const y2 = this.y + Math.sin(angle + 2.5) * this.radius;
        const x3 = this.x + Math.cos(angle - 2.5) * this.radius;
        const y3 = this.y + Math.sin(angle - 2.5) * this.radius;
        
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.fill();
    }
    
    canDamagePlayer() {
        const currentTime = Date.now();
        if (currentTime - this.lastDamageTime >= CONFIG.enemyContactDamageCooldown) {
            this.lastDamageTime = currentTime;
            return true;
        }
        return false;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
}

// Assassin class (formerly Enemy)
class Assassin extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.radius = CONFIG.assassin.radius;
        this.speed = CONFIG.assassin.speed;
        this.health = CONFIG.assassin.health;
        this.type = 'assassin';
        
        // Load assassin image
        this.image = new Image();
        this.image.src = 'assets/enemy.svg';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }
    
    update(dt) {
        // Move towards player
        const dx = gameState.player.x - this.x;
        const dy = gameState.player.y - this.y;
        const direction = normalizeVector({ x: dx, y: dy });
        
        this.x += direction.x * this.speed * dt;
        this.y += direction.y * this.speed * dt;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Calculate angle towards player for rotation
        const angle = Math.atan2(gameState.player.y - this.y, gameState.player.x - this.x);
        
        if (this.imageLoaded) {
            // Draw the image if loaded
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            // Fallback to triangle
            this.drawTriangle(ctx, angle, 'red');
        }
        
        ctx.restore();
    }
}


// Shooter class
class Shooter extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.radius = CONFIG.shooter.radius;
        this.health = 1;
        this.type = 'shooter';
        this.telegraphing = false;
        this.telegraphTimer = 0;
        this.lastFireTime = 0;
        
        // Load shooter image
        this.image = new Image();
        this.image.src = 'assets/shooter.svg';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }
    
    update(dt) {
        const currentTime = Date.now();
        
        // Handle telegraph and firing
        if (this.telegraphing) {
            this.telegraphTimer -= dt * 1000;
            if (this.telegraphTimer <= 0) {
                this.telegraphing = false;
                this.fire();
                this.lastFireTime = currentTime;
            }
        } else if (currentTime - this.lastFireTime >= CONFIG.shooter.fireInterval) {
            this.telegraphing = true;
            this.telegraphTimer = CONFIG.shooter.telegraphTime;
        }
    }
    
    fire() {
        // Calculate direction to player with random spread
        const dx = gameState.player.x - this.x;
        const dy = gameState.player.y - this.y;
        const angle = Math.atan2(dy, dx);
        
        // Add random spread (±4 degrees)
        const spreadRadians = (Math.random() * CONFIG.shooter.bulletSpread * 2 - CONFIG.shooter.bulletSpread) * Math.PI / 180;
        const finalAngle = angle + spreadRadians;
        
        // Create enemy bullet
        gameState.enemyBullets.push(new EnemyBullet(
            this.x,
            this.y,
            Math.cos(finalAngle),
            Math.sin(finalAngle)
        ));
        
        playSfx('shoot');
    }
    
    draw(ctx) {
        ctx.save();
        
        // Calculate angle towards player for rotation
        const angle = Math.atan2(gameState.player.y - this.y, gameState.player.x - this.x);
        
        if (this.imageLoaded) {
            // Draw the image if loaded
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            // Fallback to triangle
            this.drawTriangle(ctx, angle, 'orange');
        }
        
        // Draw telegraph line if active
        if (this.telegraphing) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            const lineLength = 100;
            ctx.lineTo(
                this.x + Math.cos(angle) * lineLength,
                this.y + Math.sin(angle) * lineLength
            );
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// Tank class
class Tank extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.radius = CONFIG.tank.radius;
        this.speed = CONFIG.tank.speed;
        this.health = CONFIG.tank.health;
        this.type = 'tank';
        this.isFlashing = false;
        this.flashTimer = 0;
        
        // Load tank image
        this.image = new Image();
        this.image.src = 'assets/tank.svg';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }
    
    update(dt) {
        // Move towards player
        const dx = gameState.player.x - this.x;
        const dy = gameState.player.y - this.y;
        const direction = normalizeVector({ x: dx, y: dy });
        
        this.x += direction.x * this.speed * dt;
        this.y += direction.y * this.speed * dt;
        
        // Update flash timer
        if (this.isFlashing) {
            this.flashTimer -= dt * 1000;
            if (this.flashTimer <= 0) {
                this.isFlashing = false;
            }
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.isFlashing = true;
        this.flashTimer = CONFIG.tank.flashTime;
        
        // Apply knockback
        const dx = this.x - gameState.player.x;
        const dy = this.y - gameState.player.y;
        const direction = normalizeVector({ x: dx, y: dy });
        this.x += direction.x * CONFIG.tank.knockback;
        this.y += direction.y * CONFIG.tank.knockback;
        
        return this.health <= 0;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Calculate angle towards player for rotation
        const angle = Math.atan2(gameState.player.y - this.y, gameState.player.x - this.x);
        
        if (this.imageLoaded) {
            // Draw the image if loaded
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            
            // Flash effect
            if (this.isFlashing) {
                ctx.globalAlpha = 0.7;
            }
            
            ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            // Fallback to triangle with thicker outline
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            
            // Flash effect
            if (this.isFlashing) {
                ctx.globalAlpha = 0.7;
            }
            
            // Draw filled triangle
            ctx.fillStyle = 'darkred';
            ctx.beginPath();
            ctx.moveTo(this.radius, 0);
            ctx.lineTo(-this.radius/2, this.radius/2);
            ctx.lineTo(-this.radius/2, -this.radius/2);
            ctx.closePath();
            ctx.fill();
            
            // Draw outline
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // Draw health bar
        this.drawHealthBar(ctx);
        
        ctx.restore();
    }
    
    drawHealthBar(ctx) {
        const barWidth = this.radius * 2;
        const barHeight = 5;
        const barY = -this.radius - 10;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-barWidth/2, barY, barWidth, barHeight);
        
        // Health segments
        const segmentWidth = barWidth / CONFIG.tank.health;
        ctx.fillStyle = 'red';
        for (let i = 0; i < this.health; i++) {
            ctx.fillRect(-barWidth/2 + i * segmentWidth, barY, segmentWidth - 1, barHeight);
        }
    }
}

// Enemy Bullet class
class EnemyBullet {
    constructor(x, y, dirX, dirY) {
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.radius = CONFIG.shooter.bulletRadius;
        this.speed = CONFIG.shooter.bulletSpeed;
        this.creationTime = Date.now();
    }
    
    update(dt) {
        this.x += this.dirX * this.speed * dt;
        this.y += this.dirY * this.speed * dt;
    }
    
    isExpired() {
        return Date.now() - this.creationTime > CONFIG.shooter.bulletLifetime;
    }
    
    isOutOfBounds() {
        return (
            this.x < -this.radius ||
            this.x > CONFIG.canvasWidth + this.radius ||
            this.y < -this.radius ||
            this.y > CONFIG.canvasHeight + this.radius
        );
    }
    
    draw(ctx) {
        ctx.save();
        
        ctx.fillStyle = '#FF3B30';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Bullet class
class Bullet {
    constructor(x, y, dirX, dirY) {
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.radius = CONFIG.bulletRadius;
        this.speed = CONFIG.bulletSpeed;
        
        // Load bullet image
        this.image = new Image();
        this.image.src = 'assets/bullet.svg';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }
    
    update(dt) {
        this.x += this.dirX * this.speed * dt;
        this.y += this.dirY * this.speed * dt;
    }
    
    isOutOfBounds() {
        return (
            this.x < -this.radius ||
            this.x > CONFIG.canvasWidth + this.radius ||
            this.y < -this.radius ||
            this.y > CONFIG.canvasHeight + this.radius
        );
    }
    
    draw(ctx) {
        ctx.save();
        
        if (this.imageLoaded) {
            // Draw the image if loaded
            ctx.drawImage(this.image, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            // Fallback to circle
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Utility functions
function normalizeVector(vector) {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) {
        return { x: 0, y: 0 };
    }
    return {
        x: vector.x / length,
        y: vector.y / length
    };
}

function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < obj1.radius + obj2.radius;
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x, y;
    
    switch (side) {
        case 0: // top
            x = Math.random() * CONFIG.canvasWidth;
            y = 0;
            break;
        case 1: // right
            x = CONFIG.canvasWidth;
            y = Math.random() * CONFIG.canvasHeight;
            break;
        case 2: // bottom
            x = Math.random() * CONFIG.canvasWidth;
            y = CONFIG.canvasHeight;
            break;
        case 3: // left
            x = 0;
            y = Math.random() * CONFIG.canvasHeight;
            break;
    }
    
    // Check if spawn point is too close to player
    const dx = x - gameState.player.x;
    const dy = y - gameState.player.y;
    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    if (distanceToPlayer < CONFIG.enemySpawnMinDistance) {
        // Skip this spawn attempt
        return;
    }
    
    // Randomly select enemy type
    const enemyType = Math.random();
    
    if (enemyType < 0.5) {
        // 50% chance for Assassin
        gameState.enemies.push(new Assassin(x, y));
    } else if (enemyType < 0.8) {
        // 30% chance for Shooter
        gameState.enemies.push(new Shooter(x, y));
    } else {
        // 20% chance for Tank
        gameState.enemies.push(new Tank(x, y));
    }
    
    playSfx('spawn');
}

// Audio system
function playSfx(name) {
    const audio = new Audio(`assets/${name}.wav`);
    audio.play().catch(e => {
        // Fail silently if audio file is missing
        console.log(`Audio file for ${name} not found`);
    });
}

// UI functions
function showMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'game-message';
    messageElement.textContent = text;
    messageElement.style.position = 'absolute';
    messageElement.style.top = '100px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.zIndex = '100';
    
    document.getElementById('game-container').appendChild(messageElement);
    
    setTimeout(() => {
        messageElement.remove();
    }, 2000);
}

function showGameOver() {
    document.getElementById('game-over').classList.remove('hidden');
}

function hideGameOver() {
    document.getElementById('game-over').classList.add('hidden');
}

function restartGame() {
    // Reset game state
    gameState.currentState = CONFIG.states.PLAYING;
    gameState.enemies = [];
    gameState.bullets = [];
    gameState.score = 0;
    gameState.lastEnemySpawnTime = Date.now();
    
    // Reset player
    gameState.player = new Player(CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);
    
    // Reset input manager
    inputManager.reset();
    
    // Hide game over screen
    hideGameOver();
}

// Game loop functions
function update(dt) {
    if (gameState.currentState !== CONFIG.states.PLAYING) {
        return;
    }
    
    // Update player
    gameState.player.update(dt, inputManager);
    
    // Spawn enemies
    const currentTime = Date.now();
    if (currentTime - gameState.lastEnemySpawnTime >= CONFIG.enemySpawnInterval) {
        spawnEnemy();
        gameState.lastEnemySpawnTime = currentTime;
    }
    
    // Update enemies
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        gameState.enemies[i].update(dt);
        
        // Check for collision with player
        if (checkCollision(gameState.enemies[i], gameState.player) && gameState.enemies[i].canDamagePlayer()) {
            gameState.player.takeDamage();
        }
    }
    
    // Update player bullets
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        gameState.bullets[i].update(dt);
        
        // Remove bullets that are out of bounds
        if (gameState.bullets[i].isOutOfBounds()) {
            gameState.bullets.splice(i, 1);
            continue;
        }
        
        // Check for collision with enemies
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            if (checkCollision(gameState.bullets[i], gameState.enemies[j])) {
                // Remove bullet
                gameState.bullets.splice(i, 1);
                
                // Damage enemy and check if it died
                const enemyDied = gameState.enemies[j].takeDamage(1);
                if (enemyDied) {
                    gameState.enemies.splice(j, 1);
                    gameState.score++;
                    playSfx('death');
                }
                break;
            }
        }
    }
    
    // Update enemy bullets
    for (let i = gameState.enemyBullets.length - 1; i >= 0; i--) {
        gameState.enemyBullets[i].update(dt);
        
        // Remove bullets that are out of bounds or expired
        if (gameState.enemyBullets[i].isOutOfBounds() || gameState.enemyBullets[i].isExpired()) {
            gameState.enemyBullets.splice(i, 1);
            continue;
        }
        
        // Check for collision with player
        if (checkCollision(gameState.enemyBullets[i], gameState.player)) {
            gameState.enemyBullets.splice(i, 1);
            gameState.player.takeDamage();
        }
    }
}

function render() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw game objects
    if (gameState.currentState === CONFIG.states.PLAYING || gameState.currentState === CONFIG.states.GAME_OVER) {
        // Draw bullets
        gameState.bullets.forEach(bullet => bullet.draw(ctx));
        
        // Draw enemy bullets
        gameState.enemyBullets.forEach(bullet => bullet.draw(ctx));
        
        // Draw enemies
        gameState.enemies.forEach(enemy => enemy.draw(ctx));
        
        // Draw player
        gameState.player.draw(ctx);
        
        // Draw HUD
        drawHUD(ctx);
    }
}

function drawHUD(ctx) {
    ctx.save();
    
    // Draw health
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Health: ${gameState.player.health}`, 20, 20);
    
    // Draw weapon info
    const ammoText = gameState.player.currentWeapon === 'Machine Gun' 
        ? gameState.player.machineGunAmmo 
        : '∞';
    ctx.fillText(`Weapon: ${gameState.player.currentWeapon} (${ammoText})`, 20, 50);
    
    // Draw score
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${gameState.score}`, CONFIG.canvasWidth - 20, 20);
    
    ctx.restore();
}

function gameLoop(timestamp) {
    // Calculate delta time
    if (!gameState.lastFrameTime) {
        gameState.lastFrameTime = timestamp;
    }
    
    const dt = (timestamp - gameState.lastFrameTime) / 1000; // Convert to seconds
    gameState.lastFrameTime = timestamp;
    
    // Update and render
    update(dt);
    render();
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Initialize game
function initGame() {
    const canvas = document.getElementById('game-canvas');
    canvas.width = CONFIG.canvasWidth;
    canvas.height = CONFIG.canvasHeight;
    
    // Create input manager
    window.inputManager = new InputManager();
    
    // Create player
    gameState.player = new Player(CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);
    
    // Set up restart button
    document.getElementById('restart-button').addEventListener('click', restartGame);
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Start the game when the page loads
window.addEventListener('load', initGame);