// Main game entry point - 2D Shooter MVP
import { CONFIG } from './js/config.js';
import { InputManager } from './js/input.js';
import { Game } from './js/game.js';

class GameEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.game = null;
        this.inputManager = null;
        
        // Game loop
        this.lastTime = 0;
        this.accumulator = 0;
        this.targetFrameTime = 1000 / CONFIG.performance.targetFPS;
        this.maxFrameTime = 1000 / CONFIG.performance.minFPS;
        
        // Performance monitoring
        this.frameCount = 0;
        this.fpsTimer = 0;
        this.currentFPS = 0;
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        
        console.log('Game Engine initializing...');
    }
    
    async initialize() {
        try {
            // Initialize canvas and context
            this.initializeCanvas();
            
            // Initialize input manager
            this.inputManager = new InputManager(this.canvas);
            
            // Initialize game
            this.game = new Game(this.canvas, this.ctx, this.inputManager);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up UI event handlers
            this.setupUIHandlers();
            
            console.log('Game Engine initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize game engine:', error);
            return false;
        }
    }
    
    initializeCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('2D context not supported');
        }
        
        // Set canvas size
        this.canvas.width = CONFIG.canvasWidth;
        this.canvas.height = CONFIG.canvasHeight;
        
        // Configure context
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.textBaseline = 'top';
        
        console.log(`Canvas initialized: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Visibility change (pause when tab is hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
        
        // Mouse events for audio context (autoplay policy)
        this.canvas.addEventListener('click', () => {
            this.game.audioManager.handleUserInteraction();
        });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Focus handling
        this.canvas.addEventListener('focus', () => {
            this.resume();
        });
        
        this.canvas.addEventListener('blur', () => {
            // Don't auto-pause on blur, let visibility change handle it
        });
        
        // Make canvas focusable
        this.canvas.tabIndex = 0;
        this.canvas.focus();
    }
    
    setupUIHandlers() {
        // Restart button
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.restart();
            });
        }
        
        // Debug toggle (if exists)
        const debugToggle = document.getElementById('debugToggle');
        if (debugToggle) {
            debugToggle.addEventListener('change', (e) => {
                CONFIG.debug.showDebugInfo = e.target.checked;
            });
        }
    }
    
    handleResize() {
        // Maintain aspect ratio
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const targetAspectRatio = CONFIG.canvasWidth / CONFIG.canvasHeight;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let newWidth, newHeight;
        
        if (containerAspectRatio > targetAspectRatio) {
            // Container is wider than target ratio
            newHeight = containerHeight;
            newWidth = newHeight * targetAspectRatio;
        } else {
            // Container is taller than target ratio
            newWidth = containerWidth;
            newHeight = newWidth / targetAspectRatio;
        }
        
        this.canvas.style.width = `${newWidth}px`;
        this.canvas.style.height = `${newHeight}px`;
        
        console.log(`Canvas resized: ${newWidth}x${newHeight} (display)`);
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        
        console.log('Game loop starting...');
        this.gameLoop();
    }
    
    stop() {
        this.isRunning = false;
        console.log('Game loop stopped');
    }
    
    pause() {
        if (!this.isPaused) {
            this.isPaused = true;
            this.game?.pause();
            console.log('Game paused');
        }
    }
    
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            this.game?.resume();
            this.lastTime = performance.now(); // Reset timing
            console.log('Game resumed');
        }
    }
    
    restart() {
        console.log('Restarting game...');
        this.game?.reset();
        this.resume();
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        let deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Cap delta time to prevent spiral of death
        deltaTime = Math.min(deltaTime, this.maxFrameTime);
        
        // Update performance stats
        this.updatePerformanceStats(deltaTime);
        
        if (!this.isPaused) {
            // Fixed timestep with accumulator
            this.accumulator += deltaTime;
            
            while (this.accumulator >= this.targetFrameTime) {
                // Handle input
                this.game.handleInput();
                
                // Update game
                this.game.update(this.targetFrameTime);
                
                this.accumulator -= this.targetFrameTime;
            }
            
            // Update game performance tracking
            this.game.updatePerformance(deltaTime);
        }
        
        // Always render (even when paused)
        this.render();
        
        // Update debug info
        this.updateDebugInfo();
        
        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render game
        this.game.render(this.ctx);
        
        // Render pause overlay if paused
        if (this.isPaused) {
            this.renderPauseOverlay();
        }
    }
    
    renderPauseOverlay() {
        this.ctx.save();
        
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Pause text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 24);
        
        this.ctx.restore();
    }
    
    updatePerformanceStats(deltaTime) {
        this.frameCount++;
        this.fpsTimer += deltaTime;
        
        if (this.fpsTimer >= 1000) {
            this.currentFPS = Math.round(this.frameCount * 1000 / this.fpsTimer);
            this.frameCount = 0;
            this.fpsTimer = 0;
        }
    }
    
    updateDebugInfo() {
        if (!CONFIG.debug.showDebugInfo) return;
        
        const debugElement = document.getElementById('debugInfo');
        if (!debugElement) return;
        
        const gameDebug = this.game.getDebugInfo();
        
        debugElement.innerHTML = `
            <div><strong>Performance:</strong></div>
            <div>FPS: ${this.currentFPS} / ${gameDebug.fps}</div>
            <div>Frame Time: ${gameDebug.frameTime.toFixed(2)}ms</div>
            <div><strong>Entities:</strong></div>
            <div>Enemies: ${gameDebug.entities.enemies}</div>
            <div>Bullets: ${gameDebug.entities.bullets}</div>
            <div>Total: ${gameDebug.entities.total}</div>
            <div><strong>Player:</strong></div>
            <div>Health: ${gameDebug.player.health}/${this.game.player.maxHealth}</div>
            <div>Position: (${gameDebug.player.position.x}, ${gameDebug.player.position.y})</div>
            <div>Invulnerable: ${gameDebug.player.invulnerable}</div>
            <div><strong>Game:</strong></div>
            <div>State: ${gameDebug.game.state}</div>
            <div>Time: ${gameDebug.game.time}s</div>
            <div><strong>Audio:</strong></div>
            <div>Loaded: ${gameDebug.audio.loaded}/${gameDebug.audio.total}</div>
            <div>Failed: ${gameDebug.audio.failed}</div>
        `;
    }
    
    // Public API
    getGame() {
        return this.game;
    }
    
    getInputManager() {
        return this.inputManager;
    }
    
    getCurrentFPS() {
        return this.currentFPS;
    }
    
    isGameRunning() {
        return this.isRunning && !this.isPaused;
    }
}

// Initialize and start the game
let gameEngine = null;

async function initializeGame() {
    try {
        gameEngine = new GameEngine();
        const success = await gameEngine.initialize();
        
        if (success) {
            gameEngine.start();
            console.log('2D Shooter MVP started successfully!');
            
            // Handle initial resize
            gameEngine.handleResize();
            
        } else {
            throw new Error('Failed to initialize game engine');
        }
        
    } catch (error) {
        console.error('Game initialization failed:', error);
        
        // Show error message to user
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ff0000';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game failed to load', canvas.width / 2, canvas.height / 2);
            ctx.fillText('Check console for details', canvas.width / 2, canvas.height / 2 + 30);
        }
    }
}

// Start the game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// Export for debugging
window.gameEngine = gameEngine;

console.log('2D Shooter MVP loading...');