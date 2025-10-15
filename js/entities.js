// Game Entities - Player, Enemy, Bullet classes
import { CONFIG } from './config.js';
import { 
    normalizeVector, 
    vectorDistance, 
    checkCircleCollision, 
    clampToBounds, 
    getRandomEdgePosition,
    createTimer,
    colorWithAlpha
} from './utils.js';

// Base Entity class
class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.health = 1;
        this.maxHealth = 1;
        this.active = true;
    }
    
    update(dt) {
        // Override in subclasses
    }
    
    draw(ctx) {
        // Override in subclasses
    }
    
    takeDamage(amount = 1) {
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
        }
    }
    
    isActive() {
        return this.active;
    }
    
    getCollisionBounds() {
        return {
            x: this.x,
            y: this.y,
            radius: this.radius
        };
    }
}

// Player class
export class Player extends Entity {
    constructor(x, y) {
        super(x, y);
        this.radius = CONFIG.player.radius;
        this.speed = CONFIG.player.speed;
        this.health = CONFIG.player.maxHealth;
        this.maxHealth = CONFIG.player.maxHealth;
        
        // Weapon system
        this.currentWeapon = 'machineGun';
        this.weapons = {
            machineGun: {
                ...CONFIG.weapons.machineGun,
                lastFireTime: 0
            }
        };
        
        // Damage and invulnerability
        this.invulnerable = false;
        this.invulnerabilityTimer = createTimer(CONFIG.player.invulnerabilityDuration);
        this.flashTimer = createTimer(CONFIG.player.flashDuration);
        this.isDamaged = false;
        
        // Movement
        this.velocity = { x: 0, y: 0 };
        
        // Asset loading
        this.image = null;
        this.imageLoaded = false;
        this.loadAssets();
    }
    
    loadAssets() {
        this.image = new Image();
        this.image.onload = () => {
            this.imageLoaded = true;
        };
        this.image.onerror = () => {
            console.warn('Failed to load player image, using fallback');
            this.imageLoaded = false;
        };
        this.image.src = CONFIG.assets.images.player;
    }
    
    update(dt, inputManager) {
        // Update timers
        this.invulnerabilityTimer.update(dt);
        this.flashTimer.update(dt);
        
        // Update invulnerability state
        if (this.invulnerabilityTimer.isComplete) {
            this.invulnerable = false;
        }
        
        // Update damage flash
        this.isDamaged = !this.flashTimer.isComplete;
        
        // Handle movement
        if (inputManager.moveVector.x !== 0 || inputManager.moveVector.y !== 0) {
            this.velocity.x = inputManager.moveVector.x * this.speed;
            this.velocity.y = inputManager.moveVector.y * this.speed;
            
            // Update position
            this.x += this.velocity.x * dt / 1000;
            this.y += this.velocity.y * dt / 1000;
            
            // Clamp to arena bounds
            const bounds = clampToBounds(
                this.x, this.y,
                this.radius, this.radius,
                CONFIG.arenaWidth - this.radius,
                CONFIG.arenaHeight - this.radius
            );
            this.x = bounds.x;
            this.y = bounds.y;
        }
    }
    
    tryFire(mouseX, mouseY) {
        const weapon = this.weapons[this.currentWeapon];
        const now = Date.now();
        
        // Check fire rate
        if (now - weapon.lastFireTime < weapon.fireRate) {
            return null;
        }
        
        // Check ammo (if not infinite)
        if (weapon.ammo !== Infinity && weapon.ammo <= 0) {
            return null;
        }
        
        // Calculate direction to mouse
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const direction = normalizeVector(dx, dy);
        
        // Create bullet
        const bullet = new Bullet(
            this.x + direction.x * this.radius,
            this.y + direction.y * this.radius,
            direction.x,
            direction.y,
            weapon.bulletSpeed
        );
        
        // Update weapon state
        weapon.lastFireTime = now;
        if (weapon.ammo !== Infinity) {
            weapon.ammo--;
        }
        
        return bullet;
    }
    
    switchWeapon() {
        // Placeholder for weapon switching
        const weaponNames = Object.keys(this.weapons);
        const currentIndex = weaponNames.indexOf(this.currentWeapon);
        const nextIndex = (currentIndex + 1) % weaponNames.length;
        this.currentWeapon = weaponNames[nextIndex];
        
        return `Switch: ${this.weapons[this.currentWeapon].name} (placeholder)`;
    }
    
    takeDamage(amount = 1) {
        if (this.invulnerable) return false;
        
        super.takeDamage(amount);
        
        // Start invulnerability and flash
        this.invulnerable = true;
        this.invulnerabilityTimer.reset();
        this.flashTimer.reset();
        this.isDamaged = true;
        
        return true;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Apply damage flash
        if (this.isDamaged) {
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.02);
        }
        
        if (this.imageLoaded && this.image) {
            // Draw sprite
            ctx.drawImage(
                this.image,
                this.x - this.radius,
                this.y - this.radius,
                this.radius * 2,
                this.radius * 2
            );
        } else {
            // Draw circle fallback
            ctx.fillStyle = this.isDamaged ? CONFIG.colors.playerDamaged : CONFIG.colors.player;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Debug collision bounds
        if (CONFIG.debug.showCollisionBoxes) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    getCurrentWeapon() {
        return this.weapons[this.currentWeapon];
    }
    
    reset() {
        this.x = CONFIG.player.startX;
        this.y = CONFIG.player.startY;
        this.health = this.maxHealth;
        this.active = true;
        this.invulnerable = false;
        this.invulnerabilityTimer.reset();
        this.flashTimer.reset();
        this.isDamaged = false;
        this.velocity = { x: 0, y: 0 };
        
        // Reset weapons
        Object.values(this.weapons).forEach(weapon => {
            weapon.lastFireTime = 0;
            if (weapon.ammo !== Infinity) {
                weapon.ammo = CONFIG.weapons[this.currentWeapon].ammo;
            }
        });
    }
}

// Enemy class
export class Enemy extends Entity {
    constructor(x, y) {
        super(x, y);
        this.radius = CONFIG.enemy.radius;
        this.speed = CONFIG.enemy.speed;
        this.health = CONFIG.enemy.health;
        this.damage = CONFIG.enemy.damage;
        
        // Movement
        this.velocity = { x: 0, y: 0 };
        this.targetX = 0;
        this.targetY = 0;
        
        // Asset loading
        this.image = null;
        this.imageLoaded = false;
        this.loadAssets();
    }
    
    loadAssets() {
        this.image = new Image();
        this.image.onload = () => {
            this.imageLoaded = true;
        };
        this.image.onerror = () => {
            console.warn('Failed to load enemy image, using fallback');
            this.imageLoaded = false;
        };
        this.image.src = CONFIG.assets.images.enemy;
    }
    
    update(dt, playerX, playerY) {
        // Move towards player
        this.targetX = playerX;
        this.targetY = playerY;
        
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const direction = normalizeVector(dx, dy);
        
        this.velocity.x = direction.x * this.speed;
        this.velocity.y = direction.y * this.speed;
        
        // Update position
        this.x += this.velocity.x * dt / 1000;
        this.y += this.velocity.y * dt / 1000;
        
        // Keep in bounds
        const bounds = clampToBounds(
            this.x, this.y,
            this.radius, this.radius,
            CONFIG.arenaWidth - this.radius,
            CONFIG.arenaHeight - this.radius
        );
        this.x = bounds.x;
        this.y = bounds.y;
    }
    
    draw(ctx) {
        ctx.save();
        
        if (this.imageLoaded && this.image) {
            // Draw sprite
            ctx.drawImage(
                this.image,
                this.x - this.radius,
                this.y - this.radius,
                this.radius * 2,
                this.radius * 2
            );
        } else {
            // Draw triangle fallback
            ctx.fillStyle = CONFIG.colors.enemy;
            ctx.beginPath();
            ctx.moveTo(this.x + this.radius, this.y);
            ctx.lineTo(this.x - this.radius * 0.5, this.y - this.radius * 0.8);
            ctx.lineTo(this.x - this.radius * 0.5, this.y + this.radius * 0.8);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
        
        // Debug collision bounds
        if (CONFIG.debug.showCollisionBoxes) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    canDamagePlayer(player) {
        return checkCircleCollision(
            this.x, this.y, this.radius,
            player.x, player.y, player.radius
        );
    }
    
    static spawn(playerX, playerY) {
        let position;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            position = getRandomEdgePosition(CONFIG.arenaWidth, CONFIG.arenaHeight, 50);
            attempts++;
        } while (
            vectorDistance(position.x, position.y, playerX, playerY) < CONFIG.enemy.minDistanceFromPlayer &&
            attempts < maxAttempts
        );
        
        return new Enemy(position.x, position.y);
    }
}

// Bullet class
export class Bullet extends Entity {
    constructor(x, y, dirX, dirY, speed = CONFIG.bullet.speed) {
        super(x, y);
        this.radius = CONFIG.bullet.radius;
        this.dirX = dirX;
        this.dirY = dirY;
        this.speed = speed;
        this.distanceTraveled = 0;
        this.maxDistance = CONFIG.bullet.maxDistance;
        
        // Asset loading
        this.image = null;
        this.imageLoaded = false;
        this.loadAssets();
    }
    
    loadAssets() {
        this.image = new Image();
        this.image.onload = () => {
            this.imageLoaded = true;
        };
        this.image.onerror = () => {
            console.warn('Failed to load bullet image, using fallback');
            this.imageLoaded = false;
        };
        this.image.src = CONFIG.assets.images.bullet;
    }
    
    update(dt) {
        const distance = this.speed * dt / 1000;
        
        this.x += this.dirX * distance;
        this.y += this.dirY * distance;
        this.distanceTraveled += distance;
        
        // Check if bullet is out of bounds or traveled too far
        if (this.distanceTraveled > this.maxDistance ||
            this.x < 0 || this.x > CONFIG.arenaWidth ||
            this.y < 0 || this.y > CONFIG.arenaHeight) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        if (this.imageLoaded && this.image) {
            // Draw sprite
            ctx.drawImage(
                this.image,
                this.x - this.radius,
                this.y - this.radius,
                this.radius * 2,
                this.radius * 2
            );
        } else {
            // Draw circle fallback
            ctx.fillStyle = CONFIG.colors.bullet;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Debug collision bounds
        if (CONFIG.debug.showCollisionBoxes) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    checkCollision(entity) {
        return checkCircleCollision(
            this.x, this.y, this.radius,
            entity.x, entity.y, entity.radius
        );
    }
}

// Enemy Bullet class (for future enemy weapons)
export class EnemyBullet extends Bullet {
    constructor(x, y, dirX, dirY, speed = CONFIG.bullet.speed) {
        super(x, y, dirX, dirY, speed);
    }
    
    draw(ctx) {
        ctx.save();
        
        // Draw different colored bullet for enemies
        ctx.fillStyle = CONFIG.colors.enemyBullet;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}