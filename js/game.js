// Main Game Class - Handles game logic, entities, and collision detection
import { CONFIG } from './config.js';
import { Player, Enemy, Bullet } from './entities.js';
import { GameStateMachine, initializeGameStates, playingStateInstance } from './gameState.js';
import { AudioManager } from './audio.js';
import { checkCircleCollision, createObjectPool } from './utils.js';

export class Game {
    constructor(canvas, ctx, inputManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.inputManager = inputManager;
        
        // Game entities
        this.player = new Player(CONFIG.player.startX, CONFIG.player.startY);
        this.enemies = [];
        this.bullets = [];
        
        // Object pools for performance
        this.bulletPool = createObjectPool(() => new Bullet(0, 0, 0, 0), 50);
        this.enemyPool = createObjectPool(() => new Enemy(0, 0), 20);
        
        // Game systems
        this.stateMachine = initializeGameStates();
        this.audioManager = new AudioManager();
        
        // Performance tracking
        this.lastFrameTime = 16.67; // ~60 FPS
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        this.currentFPS = 60;
        
        // Game state
        this.isPaused = false;
        this.gameTime = 0;
        
        console.log('Game initialized');
    }
    
    update(dt) {
        if (this.isPaused) return;
        
        this.gameTime += dt;
        
        // Update player
        if (this.inputManager) {
            this.player.update(dt, this.inputManager);
        }
        
        // Update enemies
        this.updateEnemies(dt);
        
        // Update bullets
        this.updateBullets(dt);
        
        // Handle collisions
        this.handleCollisions();
        
        // Clean up inactive entities
        this.cleanupEntities();
        
        // Update state machine
        this.stateMachine.update(dt, this);
    }
    
    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, this.player.x, this.player.y);
            
            if (!enemy.isActive()) {
                this.enemies.splice(i, 1);
                this.enemyPool.release(enemy);
            }
        }
    }
    
    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(dt);
            
            if (!bullet.isActive()) {
                this.bullets.splice(i, 1);
                this.bulletPool.release(bullet);
            }
        }
    }
    
    handleCollisions() {
        // Bullet vs Enemy collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                
                if (bullet.checkCollision(enemy)) {
                    // Bullet hits enemy
                    bullet.active = false;
                    enemy.takeDamage(1);
                    
                    // Play hit sound
                    this.audioManager.playSfx('hit');
                    
                    // Add kill count if enemy dies
                    if (!enemy.isActive()) {
                        if (playingStateInstance) {
                            playingStateInstance.addKill();
                        }
                        this.audioManager.playSfx('death');
                    }
                    
                    break; // Bullet can only hit one enemy
                }
            }
        }
        
        // Enemy vs Player collisions
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (enemy.canDamagePlayer(this.player)) {
                // Enemy touches player
                const damaged = this.player.takeDamage(enemy.damage);
                
                if (damaged) {
                    this.audioManager.playSfx('hurt');
                    
                    // Remove enemy after damaging player
                    enemy.active = false;
                    
                    console.log(`Player damaged! Health: ${this.player.health}/${this.player.maxHealth}`);
                }
            }
        }
    }
    
    cleanupEntities() {
        // Remove inactive bullets
        this.bullets = this.bullets.filter(bullet => bullet.isActive());
        
        // Remove inactive enemies
        this.enemies = this.enemies.filter(enemy => enemy.isActive());
    }
    
    render(ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground(ctx);
        
        // Draw entities in order: enemies, player, bullets (bullets on top)
        this.enemies.forEach(enemy => enemy.draw(ctx));
        this.player.draw(ctx);
        this.bullets.forEach(bullet => bullet.draw(ctx));
        
        // Draw arena bounds
        if (CONFIG.debug.showArenaBounds) {
            this.drawArenaBounds(ctx);
        }
        
        // Let state machine render UI
        this.stateMachine.render(ctx, this);
    }
    
    drawBackground(ctx) {
        ctx.fillStyle = CONFIG.colors.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Optional: draw grid for debugging
        if (CONFIG.debug.showGrid) {
            this.drawGrid(ctx);
        }
    }
    
    drawGrid(ctx) {
        const gridSize = 50;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    }
    
    drawArenaBounds(ctx) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, CONFIG.arenaWidth, CONFIG.arenaHeight);
    }
    
    handleInput() {
        if (!this.inputManager) return;
        
        // Let state machine handle input
        this.stateMachine.handleInput(this.inputManager, this);
    }
    
    spawnEnemy() {
        const enemy = Enemy.spawn(this.player.x, this.player.y);
        this.enemies.push(enemy);
        this.audioManager.playSfx('spawn');
        
        console.log(`Enemy spawned at (${Math.round(enemy.x)}, ${Math.round(enemy.y)})`);
    }
    
    addBullet(bullet) {
        this.bullets.push(bullet);
    }
    
    // Game state management
    pause() {
        this.isPaused = true;
    }
    
    resume() {
        this.isPaused = false;
    }
    
    reset() {
        // Reset player
        this.player.reset();
        
        // Clear all entities
        this.enemies.forEach(enemy => this.enemyPool.release(enemy));
        this.bullets.forEach(bullet => this.bulletPool.release(bullet));
        this.enemies.length = 0;
        this.bullets.length = 0;
        
        // Reset game state
        this.gameTime = 0;
        this.isPaused = false;
        
        console.log('Game reset');
    }
    
    // Performance monitoring
    updatePerformance(dt) {
        this.lastFrameTime = dt;
        this.frameCount++;
        this.fpsUpdateTime += dt;
        
        // Update FPS every second
        if (this.fpsUpdateTime >= 1000) {
            this.currentFPS = Math.round(this.frameCount * 1000 / this.fpsUpdateTime);
            this.frameCount = 0;
            this.fpsUpdateTime = 0;
        }
    }
    
    // Debug information
    getDebugInfo() {
        return {
            fps: this.currentFPS,
            frameTime: this.lastFrameTime,
            entities: {
                player: 1,
                enemies: this.enemies.length,
                bullets: this.bullets.length,
                total: 1 + this.enemies.length + this.bullets.length
            },
            pools: {
                bulletPool: this.bulletPool.getStats(),
                enemyPool: this.enemyPool.getStats()
            },
            player: {
                health: this.player.health,
                position: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
                invulnerable: this.player.invulnerable
            },
            game: {
                state: this.stateMachine.currentState,
                time: Math.round(this.gameTime / 1000),
                paused: this.isPaused
            },
            audio: this.audioManager.getDebugInfo()
        };
    }
    
    // Utility methods
    getEntitiesInRadius(x, y, radius) {
        const entities = [];
        
        // Check enemies
        this.enemies.forEach(enemy => {
            if (checkCircleCollision(x, y, radius, enemy.x, enemy.y, enemy.radius)) {
                entities.push(enemy);
            }
        });
        
        // Check bullets
        this.bullets.forEach(bullet => {
            if (checkCircleCollision(x, y, radius, bullet.x, bullet.y, bullet.radius)) {
                entities.push(bullet);
            }
        });
        
        // Check player
        if (checkCircleCollision(x, y, radius, this.player.x, this.player.y, this.player.radius)) {
            entities.push(this.player);
        }
        
        return entities;
    }
    
    getEntityCount() {
        return {
            enemies: this.enemies.length,
            bullets: this.bullets.length,
            total: this.enemies.length + this.bullets.length + 1 // +1 for player
        };
    }
}