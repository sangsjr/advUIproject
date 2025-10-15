// Input Manager with pluggable providers and automatic fallback

// Base Input Provider Interface
class InputProvider {
    constructor() {
        this.moveVector = { x: 0, y: 0 };
        this.fire = false;
        this.pickup = false;
        this.switchWeapon = false;
        this.restart = false;
        this.pause = false;
        this.mousePosition = { x: 0, y: 0 };
    }
    
    update() {
        // Override in subclasses
    }
    
    cleanup() {
        // Override in subclasses
    }
}

// Keyboard and Mouse Input Provider
class KeyboardMouseProvider extends InputProvider {
    constructor(canvas) {
        super();
        this.canvas = canvas;
        this.keys = new Set();
        this.mouseButtons = new Set();
        this.mousePosition = { x: 0, y: 0 };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys.add(e.code);
            e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
            e.preventDefault();
        });
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseButtons.add(`Mouse${e.button}`);
            e.preventDefault();
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.mouseButtons.delete(`Mouse${e.button}`);
            e.preventDefault();
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            this.mousePosition.x = (e.clientX - rect.left) * scaleX;
            this.mousePosition.y = (e.clientY - rect.top) * scaleY;
        });
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Prevent focus loss
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.focus();
    }
    
    update() {
        // Calculate movement vector
        this.moveVector.x = 0;
        this.moveVector.y = 0;
        
        // Check movement keys
        if (this.isKeyPressed(CONFIG.input.keys.left)) {
            this.moveVector.x -= 1;
        }
        if (this.isKeyPressed(CONFIG.input.keys.right)) {
            this.moveVector.x += 1;
        }
        if (this.isKeyPressed(CONFIG.input.keys.up)) {
            this.moveVector.y -= 1;
        }
        if (this.isKeyPressed(CONFIG.input.keys.down)) {
            this.moveVector.y += 1;
        }
        
        // Normalize diagonal movement
        if (this.moveVector.x !== 0 && this.moveVector.y !== 0) {
            const length = Math.sqrt(this.moveVector.x * this.moveVector.x + this.moveVector.y * this.moveVector.y);
            this.moveVector.x /= length;
            this.moveVector.y /= length;
        }
        
        // Check action keys
        this.fire = this.isKeyPressed(CONFIG.input.keys.fire);
        this.switchWeapon = this.isKeyPressed(CONFIG.input.keys.switchWeapon);
        this.restart = this.isKeyPressed(CONFIG.input.keys.restart);
        this.pause = this.isKeyPressed(CONFIG.input.keys.pause);
    }
    
    isKeyPressed(keyArray) {
        return keyArray.some(key => {
            if (key.startsWith('Mouse')) {
                return this.mouseButtons.has(key);
            }
            return this.keys.has(key);
        });
    }
    
    cleanup() {
        // Remove event listeners if needed
        // Note: In a real implementation, you'd store references to the bound functions
        // and remove them here to prevent memory leaks
    }
}

// Gesture Input Provider (placeholder for touch/mobile)
class GestureProvider extends InputProvider {
    constructor(canvas) {
        super();
        this.canvas = canvas;
        this.touches = new Map();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                this.touches.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY,
                    startTime: Date.now()
                });
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            // Update touch positions and calculate movement
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                this.touches.delete(touch.identifier);
            }
        });
    }
    
    update() {
        // Implement gesture-based input logic
        // For now, this is a placeholder
    }
}

// Voice Input Provider (placeholder)
class VoiceProvider extends InputProvider {
    constructor() {
        super();
        this.recognition = null;
        this.setupVoiceRecognition();
    }
    
    setupVoiceRecognition() {
        // Placeholder for voice recognition setup
        // Would use Web Speech API in a real implementation
        if ('webkitSpeechRecognition' in window) {
            // Setup voice recognition
        }
    }
    
    update() {
        // Process voice commands
        // Placeholder implementation
    }
}

// Main Input Manager
export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.providers = [];
        this.currentProvider = null;
        
        // Initialize providers in order of preference
        this.initializeProviders();
        
        // Expose current input state
        this.moveVector = { x: 0, y: 0 };
        this.fire = false;
        this.pickup = false;
        this.switchWeapon = false;
        this.restart = false;
        this.pause = false;
        this.mousePosition = { x: 0, y: 0 };
        
        // Track previous state for edge detection
        this.previousState = {
            fire: false,
            switchWeapon: false,
            restart: false,
            pause: false
        };
    }
    
    initializeProviders() {
        try {
            // Primary provider: Keyboard + Mouse
            const keyboardMouse = new KeyboardMouseProvider(this.canvas);
            this.providers.push(keyboardMouse);
            this.currentProvider = keyboardMouse;
            
            // Fallback providers
            if ('ontouchstart' in window) {
                this.providers.push(new GestureProvider(this.canvas));
            }
            
            // Voice provider (experimental)
            // Disabled for now to avoid dependencies
            // this.providers.push(new VoiceProvider());
            
        } catch (error) {
            console.warn('Failed to initialize some input providers:', error);
        }
    }
    
    update() {
        if (!this.currentProvider) return;
        
        // Store previous state
        this.previousState.fire = this.fire;
        this.previousState.switchWeapon = this.switchWeapon;
        this.previousState.restart = this.restart;
        this.previousState.pause = this.pause;
        
        // Update current provider
        this.currentProvider.update();
        
        // Copy state from current provider
        this.moveVector = { ...this.currentProvider.moveVector };
        this.fire = this.currentProvider.fire;
        this.pickup = this.currentProvider.pickup;
        this.switchWeapon = this.currentProvider.switchWeapon;
        this.restart = this.currentProvider.restart;
        this.pause = this.currentProvider.pause;
        this.mousePosition = { ...this.currentProvider.mousePosition };
    }
    
    // Edge detection methods (for single-press actions)
    isFirePressed() {
        return this.fire && !this.previousState.fire;
    }
    
    isSwitchWeaponPressed() {
        return this.switchWeapon && !this.previousState.switchWeapon;
    }
    
    isRestartPressed() {
        return this.restart && !this.previousState.restart;
    }
    
    isPausePressed() {
        return this.pause && !this.previousState.pause;
    }
    
    // Provider switching (automatic fallback)
    switchProvider(providerIndex) {
        if (providerIndex >= 0 && providerIndex < this.providers.length) {
            this.currentProvider = this.providers[providerIndex];
        }
    }
    
    // Get available providers
    getAvailableProviders() {
        return this.providers.map((provider, index) => ({
            index,
            name: provider.constructor.name,
            active: provider === this.currentProvider
        }));
    }
    
    cleanup() {
        this.providers.forEach(provider => provider.cleanup());
    }
}

// Export provider classes for testing
export { KeyboardMouseProvider, GestureProvider, VoiceProvider };