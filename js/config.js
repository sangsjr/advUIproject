// Configuration file - All tunable parameters for the 2D Shooter MVP
export const CONFIG = {
    // Canvas and Arena
    canvasWidth: 1200,
    canvasHeight: 800,
    arenaWidth: 1200,
    arenaHeight: 800,
    
    // Player Configuration
    player: {
        radius: 20,
        speed: 300, // pixels per second
        maxHealth: 3,
        startX: 600, // center of arena
        startY: 400, // center of arena
        invulnerabilityDuration: 800, // milliseconds
        flashDuration: 100 // milliseconds for damage flash
    },
    
    // Enemy Configuration
    enemy: {
        radius: 15,
        speed: 150, // pixels per second
        health: 1,
        damage: 1,
        spawnInterval: 2000, // milliseconds
        minDistanceFromPlayer: 100 // minimum spawn distance from player
    },
    
    // Weapon Configuration
    weapons: {
        machineGun: {
            name: 'Machine Gun',
            fireRate: 500, // milliseconds between shots
            bulletSpeed: 600, // pixels per second
            ammo: Infinity, // or a number for limited ammo
            damage: 1
        }
    },
    
    // Bullet Configuration
    bullet: {
        radius: 4,
        speed: 600, // pixels per second
        maxDistance: 1000 // maximum travel distance
    },
    
    // Game States
    gameStates: {
        BOOT: 'BOOT',
        MENU: 'MENU',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        UPGRADE_PICK: 'UPGRADE_PICK',
        GAME_OVER: 'GAME_OVER'
    },
    
    // Input Configuration
    input: {
        // Keyboard mappings
        keys: {
            // Movement
            moveUp: ['KeyW', 'ArrowUp'],
            moveDown: ['KeyS', 'ArrowDown'],
            moveLeft: ['KeyA', 'ArrowLeft'],
            moveRight: ['KeyD', 'ArrowRight'],
            
            // Actions
            fire: ['Space'], // Also mouse left click
            switchWeapon: ['KeyR'],
            pickup: ['KeyE'],
            pause: ['Escape'],
            restart: ['Enter']
        },
        
        // Mouse settings
        mouse: {
            sensitivity: 1.0,
            invertY: false
        },
        
        // Touch/gesture settings
        touch: {
            enabled: true,
            deadZone: 0.1,
            maxDistance: 100
        }
    },
    
    // Visual Configuration
    colors: {
        background: '#1a1a2e',
        player: '#ff6b6b',
        playerDamaged: '#ff9999',
        enemy: '#4ecdc4',
        bullet: '#ffe66d',
        enemyBullet: '#ff6b9d',
        hudText: '#ffffff',
        gameOverText: '#ff6b6b',
        restartText: '#4ecdc4'
    },
    
    // UI Configuration
    ui: {
        font: '20px Arial',
        gameOverFont: '48px Arial',
        hudPadding: 20,
        buttonPadding: 10
    },
    
    // Audio Configuration
    audio: {
        enabled: true,
        volume: 0.7,
        sfxVolume: 0.5,
        musicVolume: 0.3
    },
    
    // Asset Paths
    assets: {
        images: {
            player: './assets/player.png',
            enemy: './assets/enemy.png',
            bullet: './assets/bullet.png',
            background: './assets/bg.png',
            ui_weapon_mg: './assets/ui_weapon_mg.png'
        },
        sounds: {
            shoot: './assets/sounds/shoot.wav',
            hit: './assets/sounds/hit.wav',
            death: './assets/sounds/death.wav',
            spawn: './assets/sounds/spawn.wav',
            pickup: './assets/sounds/pickup.wav',
            hurt: './assets/sounds/hurt.wav',
            game_over: './assets/sounds/game_over.wav'
        }
    },
    
    // Performance Configuration
    performance: {
        targetFPS: 60,
        minFPS: 30,
        maxEntities: 200,
        maxBullets: 100,
        maxEnemies: 50
    },
    
    // Debug Configuration
    debug: {
        showDebugInfo: false,
        showCollisionBoxes: false,
        showArenaBounds: false,
        showGrid: false,
        logPerformance: false,
        logInput: false,
        logAudio: false
    }
};

// Utility function to get nested config values
export function getConfig(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], CONFIG);
}

// Utility function to set nested config values (for runtime adjustments)
export function setConfig(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj[key], CONFIG);
    if (target) {
        target[lastKey] = value;
    }
}