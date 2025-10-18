// Constants for main.js
const ARENA_WIDTH = 1200;
const ARENA_HEIGHT = 800;
const TARGET_FPS = 60;
const MIN_FPS = 55;
const ENEMY_SPAWN_INTERVAL = 2.0; // seconds
const SPAWN_SAFETY_DISTANCE = 150; // pt

import { EventBus, InputManager, KeyboardMouseProvider, GestureProvider, VoiceProvider, CollisionSystem, Utils, ImageLoader } from './core.js';
import { Player, ENEMY_REGISTRY, WEAPON_REGISTRY, Projectile } from './gameplay.js';

// Game States
export const GAME_STATES = {
    BOOT: 'boot',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    UPGRADE_PICK: 'upgrade_pick',
    GAME_OVER: 'game_over'
};

// State Machine
class GameStateMachine {
    constructor() {
        this.currentState = GAME_STATES.BOOT;
        this.previousState = null;
        this.eventBus = new EventBus();
    }
    
    setState(newState) {
        if (this.currentState === newState) return;
        
        this.previousState = this.currentState;
        this.currentState = newState;
        this.eventBus.emit('stateChanged', { from: this.previousState, to: newState });
    }
    
    getState() {
        return this.currentState;
    }
    
    isState(state) {
        return this.currentState === state;
    }
}

// Main Game Class
class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.stateMachine = new GameStateMachine();
        this.inputManager = new InputManager();
        this.eventBus = new EventBus();
        this.imageLoader = new ImageLoader();
        
        // Game objects
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        
        // Game state
        this.killCount = 0;
        this.enemySpawnTimer = 0;
        this.creatorMode = false;
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTimer = 0;
        
        // HUD elements
        this.hudElements = {
            healthHearts: null,
            pistolSlot: null,
            machinegunSlot: null,
            gameOverScreen: null,
            restartButton: null,
            toast: null
        };
        
        this.isRunning = false;
    }
    
    async init() {
        console.log('Initializing game...');
        
        // Get canvas and context
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.canvas || !this.ctx) {
            throw new Error('Failed to get canvas or context');
        }
        
        // Setup canvas
        this.setupCanvas();
        
        // Load images
        await this.loadImages();
        
        // Get HUD elements
        this.setupHUD();
        
        // Setup input
        this.setupInput();
        
        // Initialize game objects
        this.initGameObjects();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Set initial state to PLAYING
        this.stateMachine.setState(GAME_STATES.PLAYING);
        
        console.log('Game initialized successfully');
    }
    
    setupCanvas() {
        // Set canvas size
        this.canvas.width = ARENA_WIDTH;
        this.canvas.height = ARENA_HEIGHT;
        
        // Set CSS size to match
        this.canvas.style.width = ARENA_WIDTH + 'px';
        this.canvas.style.height = ARENA_HEIGHT + 'px';
        
        // Setup context
        this.ctx.imageSmoothingEnabled = false;
        
        // Add resize listener
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();
    }
    
    async loadImages() {
        const imageMap = {
            'player': 'player.png',
            'bullet_player': 'bullet_player.svg',
            'bullet_shooter': 'bullet_shooter.svg',
            'assassin': 'enemy2.png',
            'assassin_death': 'hittedenemy2.png',
            'shooter_left':  'enemy3left.png',
            'shooter_right': 'enemy3right.png',
            'shooter_hit_left':  'hittedenemy3left.png',
            'shooter_hit_right': 'hittedenemy3right.png',
            'tank': 'enemy1.png',
            'tank_death':     'hittedenemy1.png',
            'ui_weapon_pistol': 'ui_weapon_pistol.svg',
            'ui_weapon_mg': 'ui_weapon_mg.svg',
            'ui_heart': 'ui_heart.svg',
            'bg': 'bg.png'
        };
        
        try {
            await this.imageLoader.loadImages(imageMap);
            console.log('Images loaded successfully');
        } catch (error) {
            console.warn('Some images failed to load, will use fallback rendering:', error);
        }
    }
    
    resizeCanvas() {
        const container = document.getElementById('gameContainer');
        const containerRect = container.getBoundingClientRect();
        
        const scaleX = containerRect.width / ARENA_WIDTH;
        const scaleY = containerRect.height / ARENA_HEIGHT;
        const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
        
        this.canvas.style.width = (ARENA_WIDTH * scale) + 'px';
        this.canvas.style.height = (ARENA_HEIGHT * scale) + 'px';
    }
    
    setupHUD() {
        this.hudElements.healthHearts = document.getElementById('healthHearts');
        this.hudElements.pistolSlot = document.getElementById('pistol-slot');
        this.hudElements.machinegunSlot = document.getElementById('machinegun-slot');
        this.hudElements.gameOverScreen = document.getElementById('gameOverScreen');
        this.hudElements.restartButton = document.getElementById('restartButton');
        this.hudElements.toast = document.getElementById('toast');
    }
    
    setupInput() {
        // Register input providers
        const keyboardMouse = new KeyboardMouseProvider(this.canvas);
        const gesture = new GestureProvider();
        const voice = new VoiceProvider();
        
        this.inputManager.registerProvider('keyboard-mouse', keyboardMouse, true); // fallback
        this.inputManager.registerProvider('gesture', gesture);
        this.inputManager.registerProvider('voice', voice);
        
        // Set keyboard-mouse as active
        this.inputManager.setActiveProvider('keyboard-mouse');
    }
    
    initGameObjects() {
        // Create player at center
        this.player = new Player(ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
        
        // Initialize weapons
        this.weapons = {
            pistol: new WEAPON_REGISTRY.pistol(),
            machine_gun: new WEAPON_REGISTRY.machine_gun()
        };
        this.currentWeaponKey = 'pistol';
        
        // Give player the current weapon
        this.player.setWeapon(this.weapons[this.currentWeaponKey]);
        
        // Reset game state
        this.enemies = [];
        this.projectiles = [];
        this.killCount = 0;
        this.enemySpawnTimer = 0;
    }
    
    setupEventListeners() {
        // Restart button
        this.hudElements.restartButton?.addEventListener('click', () => this.restart());
        
        // Keyboard restart
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && this.stateMachine.isState(GAME_STATES.GAME_OVER)) {
                this.restart();
            }
        });
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log('Game started');
    }
    
    stop() {
        this.isRunning = false;
        console.log('Game stopped');
    }
    
    restart() {
        console.log('Restarting game...');
        this.initGameObjects();
        this.stateMachine.setState(GAME_STATES.PLAYING);
        this.hudElements.gameOverScreen?.classList.add('hidden');
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/30); // Max 30 FPS minimum
        
        this.update(this.deltaTime);
        this.render();
        this.updateFPS();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        // Update input
        this.inputManager.update(deltaTime);
        
        // Update based on current state
        switch (this.stateMachine.getState()) {
            case GAME_STATES.PLAYING:
                this.updatePlaying(deltaTime);
                break;
            case GAME_STATES.GAME_OVER:
                this.updateGameOver(deltaTime);
                break;
            // Other states would have their own update methods
        }
        
        // Handle collisions
        this.handleCollisions();
        
        // Update HUD
        this.updateHUD();
        
        // Check game over condition
        if (this.player && !this.player.isAlive() && this.stateMachine.getState() === GAME_STATES.PLAYING) {
            this.stateMachine.setState(GAME_STATES.GAME_OVER);
            this.showToast('Game Over! Press R to restart');
        }
    }
    
    updatePlaying(deltaTime) {
        const bounds = { width: ARENA_WIDTH, height: ARENA_HEIGHT };
        
        // Update player with creator mode state
        this.player.creatorMode = this.creatorMode;
        this.player.update(deltaTime, this.inputManager, bounds);
        
        // Handle player firing
        if (this.inputManager.isFiring()) {
            const mousePos = this.inputManager.getMousePosition();
            this.player.fire(mousePos.x, mousePos.y, this.projectiles);
        }
        
        // Handle weapon switching
        const weaponSwitch = this.inputManager.getWeaponSwitch();
        console.log('🎮 Weapon switch check in updatePlaying:', weaponSwitch);
        if (weaponSwitch) {
            console.log('🎮 Weapon switch detected, calling toggleWeapon()');
            this.toggleWeapon();
            this.inputManager.clearWeaponSwitch(); // Clear the switch flag after processing
        }

        // Handle creator mode toggle
        const creatorModeToggle = this.inputManager.getCreatorModeToggle();
        if (creatorModeToggle) {
            this.toggleCreatorMode();
            this.inputManager.clearCreatorModeToggle(); // Clear the toggle flag after processing
        }
        
        // Spawn enemies
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= ENEMY_SPAWN_INTERVAL) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        // Update enemies
        this.enemies.forEach(enemy => {
            if (enemy.constructor.name === 'Shooter') {
                enemy.update(deltaTime, this.player, bounds, this.projectiles);
            } else {
                enemy.update(deltaTime, this.player, bounds);
            }
        });
        
        // Update projectiles
        this.projectiles.forEach(projectile => {
            projectile.update(deltaTime, bounds);
        });
        
        // Handle collisions
        this.handleCollisions();
        
        // Remove dead objects
        this.enemies = this.enemies.filter(enemy => enemy.isAlive());
        this.projectiles = this.projectiles.filter(projectile => projectile.isAlive());
        
        // Check game over
        if (!this.player.isAlive()) {
            this.stateMachine.setState(GAME_STATES.GAME_OVER);
            this.hudElements.gameOverScreen?.classList.remove('hidden');
            const finalScore = this.hudElements.gameOverScreen?.querySelector('#finalScore');
            if (finalScore) finalScore.textContent = this.killCount.toString();
        }
    }
    
    toggleWeapon() {
        console.log('🔄 toggleWeapon() called');
        console.log('🔄 Current weapon key:', this.currentWeaponKey);
        console.log('🔄 Available weapons:', Object.keys(this.weapons));
        
        // Toggle between pistol and machine gun
        this.currentWeaponKey = this.currentWeaponKey === 'pistol' ? 'machine_gun' : 'pistol';
        console.log('🔄 New weapon key:', this.currentWeaponKey);
        
        this.player.setWeapon(this.weapons[this.currentWeaponKey]);
        console.log('🔄 Weapon set on player:', this.weapons[this.currentWeaponKey]);
        
        // Show toast notification
        const weaponName = this.currentWeaponKey === 'pistol' ? 'Pistol' : 'Machine Gun';
        this.showToast(`Switched to ${weaponName}`);
        console.log('🔄 Toast shown:', weaponName);
    }

    toggleCreatorMode() {
        this.creatorMode = !this.creatorMode;
        console.log('🎨 Creator mode toggled:', this.creatorMode);
        
        if (this.creatorMode) {
            // Apply creator mode modifications
            this.applyCreatorModeModifications();
        } else {
            // Revert creator mode modifications
            this.revertCreatorModeModifications();
        }
    }

    applyCreatorModeModifications() {
        // Store original pistol fire rate for restoration
        if (!this.originalPistolFireRate) {
            this.originalPistolFireRate = this.weapons.pistol.fireRate;
        }
        
        // Set 5x faster pistol fire rate
        this.weapons.pistol.fireRate = this.originalPistolFireRate / 5;
        console.log('🎨 Pistol fire rate increased to:', this.weapons.pistol.fireRate);
    }

    revertCreatorModeModifications() {
        // Restore original pistol fire rate
        if (this.originalPistolFireRate) {
            this.weapons.pistol.fireRate = this.originalPistolFireRate;
            console.log('🎨 Pistol fire rate restored to:', this.weapons.pistol.fireRate);
        }
    }

    updateGameOver(deltaTime) {
        // Game over state - waiting for restart
    }
    
    spawnEnemy() {
        // Randomly choose between all three enemy types
        const enemyTypes = ['assassin', 'shooter', 'tank'];
        const enemyType = enemyTypes[Utils.randomInt(0, enemyTypes.length - 1)];
        
        // Choose a random edge to spawn from (0=top, 1=right, 2=bottom, 3=left)
        const edge = Utils.randomInt(0, 3);
        let x, y;
        
        const margin = 50; // Distance from the edge
        
        switch (edge) {
            case 0: // Top edge
                x = Utils.randomRange(margin, ARENA_WIDTH - margin);
                y = -margin;
                break;
            case 1: // Right edge
                x = ARENA_WIDTH + margin;
                y = Utils.randomRange(margin, ARENA_HEIGHT - margin);
                break;
            case 2: // Bottom edge
                x = Utils.randomRange(margin, ARENA_WIDTH - margin);
                y = ARENA_HEIGHT + margin;
                break;
            case 3: // Left edge
                x = -margin;
                y = Utils.randomRange(margin, ARENA_HEIGHT - margin);
                break;
        }
        
        // Ensure minimum distance from player (safety check)
        if (Utils.distance(x, y, this.player.x, this.player.y) < SPAWN_SAFETY_DISTANCE) {
            // If too close, try a different edge
            const alternativeEdge = (edge + 2) % 4; // Opposite edge
            switch (alternativeEdge) {
                case 0: // Top edge
                    x = Utils.randomRange(margin, ARENA_WIDTH - margin);
                    y = -margin;
                    break;
                case 1: // Right edge
                    x = ARENA_WIDTH + margin;
                    y = Utils.randomRange(margin, ARENA_HEIGHT - margin);
                    break;
                case 2: // Bottom edge
                    x = Utils.randomRange(margin, ARENA_WIDTH - margin);
                    y = ARENA_HEIGHT + margin;
                    break;
                case 3: // Left edge
                    x = -margin;
                    y = Utils.randomRange(margin, ARENA_HEIGHT - margin);
                    break;
            }
        }
        
        // Create enemy
        const EnemyClass = ENEMY_REGISTRY[enemyType];
        if (EnemyClass) {
            const enemy = new EnemyClass(x, y);
            this.enemies.push(enemy);
        }
    }
    
    handleCollisions() {
        // Player vs enemies
        this.enemies.forEach(enemy => {
            if (CollisionSystem.checkCircleCollision(this.player, enemy)) {
                if (this.player.canTakeDamage()) {
                    this.player.takeDamage(enemy.damage);
                }
            }
        });
        
        // Projectiles vs enemies (player bullets hitting enemies)
        this.projectiles.forEach(projectile => {
            if (projectile.owner === 'player') {
                this.enemies.forEach(enemy => {
                    if (CollisionSystem.checkCircleCollision(projectile, enemy)) {
                        enemy.takeDamage(projectile.damage);
                        projectile.alive = false;
                        
                        if (!enemy.isAlive()) {
                            this.killCount++;
                        }
                    }
                });
            }
        });
        
        // Enemy projectiles vs player (enemy bullets hitting player)
        this.projectiles.forEach(projectile => {
            if (projectile.owner !== 'player' && projectile.owner !== null) {
                if (CollisionSystem.checkCircleCollision(projectile, this.player)) {
                    if (this.player.canTakeDamage()) {
                        this.player.takeDamage(projectile.damage);
                        projectile.alive = false;
                    }
                }
            }
        });
    }
    
    render() {
        // Clear canvas
        const bgImage = this.imageLoader.getImage('bg');
        if (bgImage) {
            this.ctx.drawImage(bgImage, 0, 0, ARENA_WIDTH, ARENA_HEIGHT);
        } else {
            this.ctx.fillStyle = '#111111';
            this.ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
        }

        // Draw arena border
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(2, 2, ARENA_WIDTH - 4, ARENA_HEIGHT - 4);
        
        // Render game objects based on state
        switch (this.stateMachine.getState()) {
            case GAME_STATES.PLAYING:
            case GAME_STATES.GAME_OVER:
                this.renderPlaying();
                break;
            // Other states would have their own rendering
        }
        
        // Debug info
        if (this.fps < MIN_FPS) {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 10, ARENA_HEIGHT - 20);
        }
    }
    
    renderPlaying() {
        // Render player
        this.player.render(this.ctx, this.imageLoader, this.inputManager.mouseX, this.inputManager.mouseY);
        
        // Render enemies
        this.enemies.forEach(enemy => {
            enemy.render(this.ctx, this.imageLoader, this.player);
        });
        
        // Render projectiles
        this.projectiles.forEach(projectile => {
            projectile.render(this.ctx, this.imageLoader);
        });
    }
    
    updateHUD() {
        // Update health display
        if (this.hudElements.healthHearts) {
            const hearts = '♥'.repeat(Math.max(0, this.player.hp));
            const emptyHearts = '♡'.repeat(Math.max(0, this.player.maxHp - this.player.hp));
            this.hudElements.healthHearts.textContent = hearts + emptyHearts;
        }
        
        // Update weapon display
        if (this.hudElements.pistolSlot && this.hudElements.machinegunSlot) {
            // Update active weapon highlighting
            if (this.currentWeaponKey === 'pistol') {
                this.hudElements.pistolSlot.classList.add('active');
                this.hudElements.machinegunSlot.classList.remove('active');
            } else {
                this.hudElements.pistolSlot.classList.remove('active');
                this.hudElements.machinegunSlot.classList.add('active');
            }
            
            // Update ammo displays
            const pistolAmmo = this.hudElements.pistolSlot.querySelector('div:last-child');
            const machinegunAmmo = this.hudElements.machinegunSlot.querySelector('div:last-child');
            
            if (pistolAmmo) {
                pistolAmmo.textContent = '∞';
            }
            if (machinegunAmmo) {
                machinegunAmmo.textContent = this.weapons.machine_gun.getAmmoDisplay();
            }
        }
    }
    
    updateFPS() {
        this.fpsCounter++;
        this.fpsTimer += this.deltaTime;
        
        if (this.fpsTimer >= 1.0) {
            this.fps = this.fpsCounter / this.fpsTimer;
            this.fpsCounter = 0;
            this.fpsTimer = 0;
        }
    }
    
    showToast(message, duration = 2000) {
        if (!this.hudElements.toast) return;
        
        this.hudElements.toast.textContent = message;
        this.hudElements.toast.style.display = 'block';
        
        setTimeout(() => {
            if (this.hudElements.toast) {
                this.hudElements.toast.style.display = 'none';
            }
        }, duration);
    }
}

// Initialize and start the game
async function startGame() {
    try {
        const game = new Game();
        await game.init();
        game.start();
        
        // Make game globally accessible for debugging
        window.game = game;
        
    } catch (error) {
        console.error('Failed to start game:', error);
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    startGame();
}