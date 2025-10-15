// Simplified main.js for debugging
console.log('Starting simplified game...');

// Test CONFIG import
try {
    const { CONFIG } = await import('./js/config.js');
    console.log('CONFIG loaded successfully:', CONFIG.canvasWidth);
} catch (error) {
    console.error('Failed to load CONFIG:', error);
}

// Test InputManager import
try {
    const { InputManager } = await import('./js/input.js');
    console.log('InputManager loaded successfully');
    
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        const inputManager = new InputManager(canvas);
        console.log('InputManager created successfully');
    }
} catch (error) {
    console.error('Failed to load InputManager:', error);
}

// Test Game import
try {
    const { Game } = await import('./js/game.js');
    console.log('Game loaded successfully');
} catch (error) {
    console.error('Failed to load Game:', error);
}

console.log('Simplified test completed');