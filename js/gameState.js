// Game State Management
import { CONFIG } from './config.js';

// Game States
export const GAME_STATES = {
    BOOT: 'BOOT',
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    UPGRADE_PICK: 'UPGRADE_PICK',
    GAME_OVER: 'GAME_OVER'
};

// State Machine
export class GameStateMachine {
    constructor() {
        this.currentState = GAME_STATES.PLAYING;
        this.previousState = null;
        this.stateStartTime = Date.now();
        this.stateData = {};
        
        // State handlers
        this.stateHandlers = {
            [GAME_STATES.PLAYING]: new PlayingState(),
            [GAME_STATES.GAME_OVER]: new GameOverState()
        };
    }
    
    setState(newState, data = {}) {
        if (this.currentState === newState) return;
        
        // Exit current state
        if (this.stateHandlers[this.currentState]) {
            this.stateHandlers[this.currentState].exit(this);
        }
        
        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateStartTime = Date.now();
        this.stateData = { ...data };
        
        // Enter new state
        if (this.stateHandlers[this.currentState]) {
            this.stateHandlers[this.currentState].enter(this, data);
        }
        
        console.log(`State changed: ${this.previousState} -> ${this.currentState}`);
    }
    
    update(dt, game) {
        if (this.stateHandlers[this.currentState]) {
            this.stateHandlers[this.currentState].update(dt, game, this);
        }
    }
    
    render(ctx, game) {
        if (this.stateHandlers[this.currentState]) {
            this.stateHandlers[this.currentState].render(ctx, game, this);
        }
    }
    
    handleInput(inputManager, game) {
        if (this.stateHandlers[this.currentState]) {
            this.stateHandlers[this.currentState].handleInput(inputManager, game, this);
        }
    }
    
    getStateTime() {
        return Date.now() - this.stateStartTime;
    }
    
    isState(state) {
        return this.currentState === state;
    }
}

// Base State class
class GameState {
    enter(stateMachine, data) {
        // Override in subclasses
    }
    
    exit(stateMachine) {
        // Override in subclasses
    }
    
    update(dt, game, stateMachine) {
        // Override in subclasses
    }
    
    render(ctx, game, stateMachine) {
        // Override in subclasses
    }
    
    handleInput(inputManager, game, stateMachine) {
        // Override in subclasses
    }
}

// Playing State
class PlayingState extends GameState {
    constructor() {
        super();
        this.enemySpawnTimer = 0;
        this.killCount = 0;
    }
    
    enter(stateMachine, data) {
        this.enemySpawnTimer = 0;
        if (data.resetKillCount !== false) {
            this.killCount = 0;
        }
        console.log('Entered PLAYING state');
    }
    
    exit(stateMachine) {
        console.log('Exited PLAYING state');
    }
    
    update(dt, game, stateMachine) {
        // Update enemy spawn timer
        this.enemySpawnTimer += dt;
        
        // Spawn enemies
        if (this.enemySpawnTimer >= CONFIG.enemy.spawnInterval) {
            game.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        // Update all game entities
        game.update(dt);
        
        // Check game over condition
        if (game.player.health <= 0) {
            stateMachine.setState(GAME_STATES.GAME_OVER, {
                killCount: this.killCount,
                finalScore: this.killCount * 100
            });
        }
    }
    
    render(ctx, game, stateMachine) {
        // Render game world
        game.render(ctx);
        
        // Render HUD
        this.renderHUD(ctx, game);
    }
    
    renderHUD(ctx, game) {
        ctx.save();
        
        // Health display
        ctx.fillStyle = CONFIG.colors.hudText;
        ctx.font = CONFIG.ui.font;
        ctx.fillText(`Health: ${game.player.health}/${game.player.maxHealth}`, 20, 30);
        
        // Weapon display
        const weapon = game.player.getCurrentWeapon();
        const ammoText = weapon.ammo === Infinity ? '∞' : weapon.ammo;
        ctx.fillText(`${weapon.name}: ${ammoText}`, 20, 60);
        
        // Kill count
        ctx.fillText(`Kills: ${this.killCount}`, 20, 90);
        
        // Debug info
        if (CONFIG.debug.showDebugInfo) {
            ctx.fillText(`Enemies: ${game.enemies.length}`, 20, 120);
            ctx.fillText(`Bullets: ${game.bullets.length}`, 20, 150);
            ctx.fillText(`FPS: ${Math.round(1000 / game.lastFrameTime)}`, 20, 180);
        }
        
        ctx.restore();
    }
    
    handleInput(inputManager, game, stateMachine) {
        // Handle weapon switching
        if (inputManager.switchWeapon()) {
            const message = game.player.switchWeapon();
            console.log(message);
            // Could show HUD message here
        }
        
        // Handle firing
        if (inputManager.fire()) {
            const mousePos = inputManager.getMousePosition();
            const bullet = game.player.tryFire(mousePos.x, mousePos.y);
            if (bullet) {
                game.addBullet(bullet);
                game.audioManager.playSfx('shoot');
            }
        }
    }
    
    addKill() {
        this.killCount++;
    }
    
    getKillCount() {
        return this.killCount;
    }
}

// Game Over State
class GameOverState extends GameState {
    constructor() {
        super();
        this.finalScore = 0;
        this.killCount = 0;
    }
    
    enter(stateMachine, data) {
        this.finalScore = data.finalScore || 0;
        this.killCount = data.killCount || 0;
        console.log(`Game Over! Final Score: ${this.finalScore}, Kills: ${this.killCount}`);
    }
    
    exit(stateMachine) {
        console.log('Exited GAME_OVER state');
    }
    
    update(dt, game, stateMachine) {
        // Game over state doesn't need to update game entities
    }
    
    render(ctx, game, stateMachine) {
        // Render dimmed game world
        ctx.save();
        ctx.globalAlpha = 0.3;
        game.render(ctx);
        ctx.restore();
        
        // Render game over screen
        this.renderGameOverScreen(ctx);
    }
    
    renderGameOverScreen(ctx) {
        const centerX = CONFIG.canvasWidth / 2;
        const centerY = CONFIG.canvasHeight / 2;
        
        ctx.save();
        
        // Background overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
        
        // Game Over text
        ctx.fillStyle = CONFIG.colors.gameOverText;
        ctx.font = CONFIG.ui.gameOverFont;
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', centerX, centerY - 80);
        
        // Score display
        ctx.font = CONFIG.ui.font;
        ctx.fillStyle = CONFIG.colors.hudText;
        ctx.fillText(`Final Score: ${this.finalScore}`, centerX, centerY - 20);
        ctx.fillText(`Enemies Killed: ${this.killCount}`, centerX, centerY + 10);
        
        // Restart instructions
        ctx.fillStyle = CONFIG.colors.restartText;
        ctx.fillText('Press ENTER to restart', centerX, centerY + 60);
        ctx.fillText('or click the Restart button', centerX, centerY + 90);
        
        ctx.restore();
    }
    
    handleInput(inputManager, game, stateMachine) {
        // Handle restart
        if (inputManager.isKeyPressed('Enter') || inputManager.isKeyPressed('Space')) {
            this.restart(game, stateMachine);
        }
    }
    
    restart(game, stateMachine) {
        // Reset game state
        game.reset();
        
        // Return to playing state
        stateMachine.setState(GAME_STATES.PLAYING, { resetKillCount: true });
    }
}

// Export the playing state instance for external access to kill count
export let playingStateInstance = null;

// Initialize playing state instance
export function initializeGameStates() {
    const stateMachine = new GameStateMachine();
    playingStateInstance = stateMachine.stateHandlers[GAME_STATES.PLAYING];
    return stateMachine;
}