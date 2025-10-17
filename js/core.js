// Constants for core.js
const COLLISION_EPSILON = 0.001;
const INPUT_DEADZONE = 0.1;
const IMG_DIR = '/assets/images/';

// Image loading system
export class ImageLoader {
    constructor() {
        this.images = new Map();
        this.loadPromises = new Map();
    }
    
    loadImage(name, filename) {
        if (this.images.has(name)) {
            return Promise.resolve(this.images.get(name));
        }
        
        if (this.loadPromises.has(name)) {
            return this.loadPromises.get(name);
        }
        
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images.set(name, img);
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${filename}`);
                reject(new Error(`Failed to load image: ${filename}`));
            };
            img.src = IMG_DIR + filename;
        });
        
        this.loadPromises.set(name, promise);
        return promise;
    }
    
    loadImages(imageMap) {
        const promises = Object.entries(imageMap).map(([name, filename]) => 
            this.loadImage(name, filename).catch(() => null) // Don't fail on individual image errors
        );
        return Promise.all(promises);
    }
    
    getImage(name) {
        return this.images.get(name) || null;
    }
    
    hasImage(name) {
        return this.images.has(name);
    }
}

// Utility functions
export const Utils = {
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    normalize(x, y) {
        const length = Math.sqrt(x * x + y * y);
        if (length === 0) return { x: 0, y: 0 };
        return { x: x / length, y: y / length };
    },
    
    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

// Event Bus for decoupled communication
export class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
    
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => callback(data));
    }
    
    clear() {
        this.listeners.clear();
    }
}

// Circle-vs-circle collision detection
export class CollisionSystem {
    static checkCircleCollision(obj1, obj2) {
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = obj1.radius + obj2.radius;
        
        return distance < minDistance + COLLISION_EPSILON;
    }
    
    static getCollisionInfo(obj1, obj2) {
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = obj1.radius + obj2.radius;
        
        if (distance >= minDistance + COLLISION_EPSILON) {
            return null;
        }
        
        const overlap = minDistance - distance;
        const normalX = distance > 0 ? dx / distance : 1;
        const normalY = distance > 0 ? dy / distance : 0;
        
        return {
            overlap,
            normalX,
            normalY,
            distance
        };
    }
}

// Input Manager with pluggable providers
export class InputManager {
    constructor() {
        this.providers = new Map();
        this.activeProvider = null;
        this.fallbackProvider = null;
        
        // Input state
        this.moveVector = { x: 0, y: 0 };
        this.fire = false;
        this.pickup = false; // Placeholder for Step 1
        this.switchWeapon = false;
        this.lastWeaponSwitchTime = 0;
        this.weaponSwitchCooldown = 0.2; // 200ms cooldown between switches
        this.creatorMode = false;
        this.lastCreatorModeToggleTime = 0;
        this.creatorModeToggleCooldown = 0.2; // 200ms cooldown between toggles
        
        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
    }
    
    registerProvider(name, provider, isFallback = false) {
        this.providers.set(name, provider);
        provider.inputManager = this;
        
        if (isFallback) {
            this.fallbackProvider = provider;
        }
        
        if (!this.activeProvider) {
            this.setActiveProvider(name);
        }
    }
    
    setActiveProvider(name) {
        const provider = this.providers.get(name);
        if (provider) {
            if (this.activeProvider) {
                this.activeProvider.deactivate?.();
            }
            this.activeProvider = provider;
            this.activeProvider.activate?.();
        }
    }
    
    update(deltaTime) {
        if (this.activeProvider) {
            try {
                this.activeProvider.update(deltaTime);
            } catch (error) {
                console.warn('Input provider failed, falling back:', error);
                this.fallbackToDefault();
            }
        }
    }
    
    clearWeaponSwitch() {
        console.log('🧹 InputManager.clearWeaponSwitch() called, was:', this.switchWeapon);
        this.switchWeapon = false;
        this.lastWeaponSwitchTime = Date.now() / 1000;
        console.log('🧹 Weapon switch cleared, lastSwitchTime updated to:', this.lastWeaponSwitchTime);
    }

    clearCreatorModeToggle() {
        this.creatorMode = false;
        this.lastCreatorModeToggleTime = Date.now() / 1000;
    }
    
    canSwitchWeapon() {
        const now = Date.now() / 1000;
        return (now - this.lastWeaponSwitchTime) >= this.weaponSwitchCooldown;
    }

    canToggleCreatorMode() {
        const now = Date.now() / 1000;
        return (now - this.lastCreatorModeToggleTime) >= this.creatorModeToggleCooldown;
    }
    
    fallbackToDefault() {
        if (this.fallbackProvider && this.activeProvider !== this.fallbackProvider) {
            this.setActiveProvider(this.fallbackProvider.name);
        }
    }
    
    // Public API for game logic
    getMoveVector() {
        return { ...this.moveVector };
    }
    
    isFiring() {
        return this.fire;
    }
    
    isPickingUp() {
        return this.pickup; // No-op placeholder for Step 1
    }
    
    getWeaponSwitch() {
        console.log('📊 InputManager.getWeaponSwitch() called, returning:', this.switchWeapon);
        return this.switchWeapon;
    }

    getCreatorModeToggle() {
        return this.creatorMode;
    }
    
    getMousePosition() {
        return { x: this.mouseX, y: this.mouseY };
    }
}

// Keyboard/Mouse Provider (implemented)
export class KeyboardMouseProvider {
    constructor(canvas) {
        this.name = 'keyboard-mouse';
        this.canvas = canvas;
        this.inputManager = null;
        
        this.keys = new Set();
        this.mouseButtons = new Set();
        
        // Key mappings
        this.keyMap = {
            'KeyW': 'up',
            'KeyS': 'down',
            'KeyA': 'left',
            'KeyD': 'right',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'KeyR': 'switchWeapon',
            'KeyG': 'creatorMode'
        };
        
        this.boundHandlers = {
            keydown: this.handleKeyDown.bind(this),
            keyup: this.handleKeyUp.bind(this),
            mousedown: this.handleMouseDown.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            mousemove: this.handleMouseMove.bind(this),
            contextmenu: this.handleContextMenu.bind(this)
        };
    }
    
    activate() {
        console.log('=== ACTIVATING KeyboardMouseProvider ===');
        console.log('Canvas element:', this.canvas);
        console.log('Document ready state:', document.readyState);
        console.log('Key mappings:', this.keyMap);
        
        Object.entries(this.boundHandlers).forEach(([event, handler]) => {
            if (event === 'mousemove' || event === 'mousedown' || event === 'mouseup' || event === 'contextmenu') {
                this.canvas.addEventListener(event, handler);
                console.log('✓ Added canvas listener for:', event);
            } else {
                document.addEventListener(event, handler);
                console.log('✓ Added document listener for:', event);
            }
        });
        
        // Test canvas focus
        console.log('Canvas focused:', document.activeElement === this.canvas);
        console.log('Canvas tabIndex:', this.canvas.tabIndex);
        
        // Force focus on canvas
        if (this.canvas.tabIndex >= 0) {
            this.canvas.focus();
            console.log('Canvas focus forced');
        }
    }
    
    deactivate() {
        Object.entries(this.boundHandlers).forEach(([event, handler]) => {
            if (event === 'mousemove' || event === 'mousedown' || event === 'mouseup' || event === 'contextmenu') {
                this.canvas.removeEventListener(event, handler);
            } else {
                document.removeEventListener(event, handler);
            }
        });
    }
    
    update(deltaTime) {
        if (!this.inputManager) return;
        
        // Update move vector
        let x = 0, y = 0;
        if (this.keys.has('left')) x -= 1;
        if (this.keys.has('right')) x += 1;
        if (this.keys.has('up')) y -= 1;
        if (this.keys.has('down')) y += 1;
        
        // Normalize diagonal movement
        if (x !== 0 && y !== 0) {
            const length = Math.sqrt(x * x + y * y);
            x /= length;
            y /= length;
        }
        
        this.inputManager.moveVector.x = x;
        this.inputManager.moveVector.y = y;
        this.inputManager.fire = this.mouseButtons.has(0); // Left mouse button
    }
    
    handleKeyDown(event) {
        console.log('RAW KEY EVENT:', event.code, event.key, 'Target:', event.target.tagName);
        const action = this.keyMap[event.code];
        console.log('Key pressed:', event.code, 'Action:', action);
        if (action) {
            if (action === 'switchWeapon') {
                console.log('Switch weapon triggered, current state:', this.inputManager.switchWeapon, 'Can switch:', this.inputManager.canSwitchWeapon());
                // Only trigger if not already set and cooldown has passed
                if (!this.inputManager.switchWeapon && this.inputManager.canSwitchWeapon()) {
                    this.inputManager.switchWeapon = true;
                    console.log('Weapon switch flag set to true');
                }
            } else if (action === 'creatorMode') {
                // Only trigger if not already set and cooldown has passed
                if (!this.inputManager.creatorMode && this.inputManager.canToggleCreatorMode()) {
                    this.inputManager.creatorMode = true;
                    console.log('Creator mode toggle flag set to true');
                }
            } else {
                this.keys.add(action);
            }
            event.preventDefault();
        }
    }
    
    handleKeyUp(event) {
        const action = this.keyMap[event.code];
        if (action && action !== 'switchWeapon' && action !== 'creatorMode') {
            this.keys.delete(action);
            event.preventDefault();
        }
    }
    
    handleMouseDown(event) {
        this.mouseButtons.add(event.button);
        event.preventDefault();
    }
    
    handleMouseUp(event) {
        this.mouseButtons.delete(event.button);
        event.preventDefault();
    }
    
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        this.inputManager.mouseX = (event.clientX - rect.left) * scaleX;
        this.inputManager.mouseY = (event.clientY - rect.top) * scaleY;
    }
    
    handleContextMenu(event) {
        event.preventDefault();
    }
}

// Gesture Provider (stub)
export class GestureProvider {
    constructor() {
        this.name = 'gesture';
        this.inputManager = null;
    }
    
    activate() {
        // TODO: Implement gesture recognition
        console.log('Gesture provider activated (stub)');
    }
    
    deactivate() {
        // TODO: Cleanup gesture listeners
        console.log('Gesture provider deactivated (stub)');
    }
    
    update(deltaTime) {
        // TODO: Process gesture input
        if (this.inputManager) {
            this.inputManager.moveVector.x = 0;
            this.inputManager.moveVector.y = 0;
            this.inputManager.fire = false;
        }
    }
}

// Voice Provider (stub)
export class VoiceProvider {
    constructor() {
        this.name = 'voice';
        this.inputManager = null;
    }
    
    activate() {
        // TODO: Initialize speech recognition
        console.log('Voice provider activated (stub)');
    }
    
    deactivate() {
        // TODO: Stop speech recognition
        console.log('Voice provider deactivated (stub)');
    }
    
    update(deltaTime) {
        // TODO: Process voice commands
        if (this.inputManager) {
            this.inputManager.moveVector.x = 0;
            this.inputManager.moveVector.y = 0;
            this.inputManager.fire = false;
        }
    }
}