// Constants for gameplay.js
const PLAYER_SPEED = 220; // pt/s
const PLAYER_RADIUS = 16; // pt
const PLAYER_MAX_HP = 3;
const PLAYER_IFRAME_DURATION = 0.8; // seconds
const ASSASSIN_SPEED = 150; // pt/s
const ASSASSIN_RADIUS = 15; // pt
const SHOOTER_SPEED = 120; // pt/s
const SHOOTER_RADIUS = 20; // pt
const SHOOTER_MOVE_DURATION = 2.0; // seconds
const SHOOTER_FIRE_RATE = 2.0; // seconds between shots
const SHOOTER_SPREAD_ANGLE = 4; // degrees
const SHOOTER_BULLET_SPEED = 400; // pt/s
const SHOOTER_BULLET_RADIUS = 4; // pt
const SHOOTER_BULLET_LIFETIME = 2.5; // seconds
const TANK_SPEED = 120; // pt/s
const TANK_RADIUS = 25; // pt
const TANK_HP = 3;
const TANK_CONTACT_COOLDOWN = 0.7; // seconds
const TANK_KNOCKBACK = 8; // pt
const TANK_FLASH_DURATION = 0.1; // seconds
const BULLET_SPEED = 600; // pt/s
const BULLET_RADIUS = 3; // pt
const PISTOL_FIRE_RATE = 1.0; // seconds between shots
const MACHINE_GUN_FIRE_RATE = 0.5; // seconds between shots
const MACHINE_GUN_AMMO = 50;

import { Utils, CollisionSystem } from './core.js';

// Base Entity class
export class Entity {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.vx = 0;
        this.vy = 0;
        this.hp = 1;
        this.maxHp = 1;
        this.alive = true;
    }
    
    update(deltaTime) {
        // Apply velocity to position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }
    
    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    takeDamage(damage) {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.alive = false;
        }
    }
    
    isAlive() {
        return this.alive;
    }
    
    getBounds() {
        return {
            left: this.x - this.radius,
            right: this.x + this.radius,
            top: this.y - this.radius,
            bottom: this.y + this.radius
        };
    }
}

// Player class
export class Player extends Entity {
    constructor(x, y) {
        super(x, y, PLAYER_RADIUS);
        this.hp = PLAYER_MAX_HP;
        this.maxHp = PLAYER_MAX_HP;
        this.speed = PLAYER_SPEED;
        this.iframeTimer = 0;
        this.flashTimer = 0;
        this.weapon = null;

        // Circular animation setup
        this.anim = {
            frames: 6,             // Total number of frames in animation
            frame: 0,              // Current frame index
            timer: 0,
            frameDuration: 0.03,   // Frame duration (seconds)
            idleFrame: 0           // Display first frame when idle
        };

        this.isMoving = false;
        this._prevX = x;
        this._prevY = y;
    }
    
    update(deltaTime, inputManager, bounds) {
        // Handle movement
        const moveVector = inputManager.getMoveVector();
        this.vx = moveVector.x * this.speed;
        this.vy = moveVector.y * this.speed;
        
        // Update position with bounds checking
        let newX = this.x + this.vx * deltaTime;
        let newY = this.y + this.vy * deltaTime;
        
        // Clamp to arena bounds
        newX = Utils.clamp(newX, this.radius, bounds.width - this.radius);
        newY = Utils.clamp(newY, this.radius, bounds.height - this.radius);
        
        this.x = newX;
        this.y = newY;
        
        // Update timers
        if (this.iframeTimer > 0) {
            this.iframeTimer -= deltaTime;
        }
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
        }
        
        // Update weapon
        if (this.weapon) {
            this.weapon.update(deltaTime);
        }


        // Update animation
        const movedDist = Math.abs(this.x - this._prevX) + Math.abs(this.y - this._prevY);
        this.isMoving = movedDist > 0.1; // Check if player is moving

        if (this.isMoving) {
            this.anim.timer += deltaTime;
            if (this.anim.timer >= this.anim.frameDuration) {
                this.anim.timer = 0;
                this.anim.frame = (this.anim.frame + 1) % this.anim.frames;
            }
        } else {
            this.anim.frame = this.anim.idleFrame;
            this.anim.timer = 0;
        }

        this._prevX = this.x;
        this._prevY = this.y;
    }
    
    render(ctx, imageLoader = null, mouseX = 0, mouseY = 0) {
        ctx.save();

        const playerSprite = imageLoader?.getImage('player');
        if (!playerSprite) {
            // Fallback: Replace with circular.
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        // Calculate rotation angle towards mouse
        const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Calculate source position in sprite sheet
        const fw = playerSprite.width / this.anim.frames;
        const fh = playerSprite.height;
        const sx = this.anim.frame * fw;
        const sy = 0;

        // Set size
        const scale = 4; // Size
        const drawW = fw * scale;
        const drawH = fh * scale;

        // Apply flash effect if invulnerable
        if (this.flashTimer > 0) {
            ctx.globalAlpha = 0.6;
            ctx.filter = 'brightness(1.8)';
        }

        ctx.drawImage(
            playerSprite,
            sx, sy, fw, fh,              // Source position in sprite sheet
            -drawW / 2, -drawH / 2,      // Draw position (center)
            drawW, drawH                 // Draw size
        );

        ctx.restore();
    }

    
    takeDamage(damage) {
        if (this.iframeTimer > 0) return false;
        
        // Check if creator mode is active (passed from game instance)
        if (this.creatorMode) {
            // In creator mode, don't take damage but still show flash effect
            this.iframeTimer = PLAYER_IFRAME_DURATION;
            this.flashTimer = 0.1; // Brief white flash
            return true;
        }
        
        super.takeDamage(damage);
        this.iframeTimer = PLAYER_IFRAME_DURATION;
        this.flashTimer = 0.1; // Brief white flash
        
        return true;
    }
    
    canTakeDamage() {
        return this.iframeTimer <= 0;
    }
    
    setWeapon(weapon) {
        this.weapon = weapon;
        if (weapon) {
            weapon.owner = this;
        }
    }
    
    fire(targetX, targetY, projectiles) {
        if (this.weapon) {
            return this.weapon.fire(this.x, this.y, targetX, targetY, projectiles);
        }
        return false;
    }
}

// Base Enemy class
export class Enemy extends Entity {
    constructor(x, y, radius, hp = 1) {
        super(x, y, radius);
        this.hp = hp;
        this.maxHp = hp;
        this.damage = 1;
        this.color = '#FF0000'; // Default red color
    }
    
    update(deltaTime, player, bounds) {
        // Call parent Entity update to apply velocity to position
        super.update(deltaTime);
        // Override in subclasses for specific behavior
    }
    
    render(ctx, imageLoader = null) {
        ctx.save();
        
        // Calculate rotation angle based on velocity direction
        const angle = Math.atan2(this.vy, this.vx);
        
        // Try to use sprite first
        const assassinSprite = imageLoader?.getImage('assassin');
        if (assassinSprite) {
            // Translate to center and rotate
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            
            // Draw sprite with size = 2 * radius
            const size = this.radius * 2;
            ctx.drawImage(assassinSprite, -size/2, -size/2, size, size);
        } else {
            // Fallback to geometry rendering
            ctx.fillStyle = this.color || '#FF0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Assassin enemy (implemented)
export class Assassin extends Enemy {
    constructor(x, y) {
        super(x, y, ASSASSIN_RADIUS, 1);
        this.speed = ASSASSIN_SPEED;
    }
    
    update(deltaTime, player, bounds) {
        if (!player.isAlive()) return;
        
        // Move towards player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Utils.distance(this.x, this.y, player.x, player.y);
        
        if (distance > 0) {
            // Normalize direction and apply speed
            this.vx = (dx / distance) * this.speed;
            this.vy = (dy / distance) * this.speed;
        }
        
        // Call parent update to apply velocity
        super.update(deltaTime, player, bounds);
        
        // Keep within bounds
        this.x = Utils.clamp(this.x, this.radius, bounds.width - this.radius);
        this.y = Utils.clamp(this.y, this.radius, bounds.height - this.radius);
    }
    
    render(ctx) {
        ctx.save();
        ctx.fillStyle = this.color || '#FF0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Shooter enemy
export class Shooter extends Enemy {
    constructor(x, y) {
        super(x, y, SHOOTER_RADIUS, 1);
        this.speed = SHOOTER_SPEED;
        this.moveTimer = 0;
        this.fireTimer = 0;
        this.isMoving = true;
        this.centerX = 0; // Will be set when bounds are available
        this.centerY = 0;
    }
    
    update(deltaTime, player, bounds, projectiles) {
        if (!player.isAlive()) return;
        
        // Set center coordinates if not set
        if (this.centerX === 0 && this.centerY === 0) {
            this.centerX = bounds.width / 2;
            this.centerY = bounds.height / 2;
        }
        
        this.moveTimer += deltaTime;
        this.fireTimer += deltaTime;
        
        // Move toward center for first 2 seconds
        if (this.isMoving && this.moveTimer < SHOOTER_MOVE_DURATION) {
            const dx = this.centerX - this.x;
            const dy = this.centerY - this.y;
            const distance = Utils.distance(this.x, this.y, this.centerX, this.centerY);
            
            if (distance > 5) { // Small threshold to avoid jittering
                const normalized = Utils.normalize(dx, dy);
                this.vx = normalized.x * this.speed;
                this.vy = normalized.y * this.speed;
            } else {
                this.vx = 0;
                this.vy = 0;
                this.isMoving = false;
            }
        } else {
            // Stop moving after 2 seconds
            this.isMoving = false;
            this.vx = 0;
            this.vy = 0;
        }
        
        // Fire at player every 2 seconds
        if (this.fireTimer >= SHOOTER_FIRE_RATE) {
            this.fireAtPlayer(player, projectiles);
            this.fireTimer = 0;
        }
        
        super.update(deltaTime, player, bounds);
        
        // Keep in bounds
        this.x = Utils.clamp(this.x, this.radius, bounds.width - this.radius);
        this.y = Utils.clamp(this.y, this.radius, bounds.height - this.radius);
    }
    
    fireAtPlayer(player, projectiles) {
        // Calculate angle to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const baseAngle = Math.atan2(dy, dx);
        
        // Add random spread (±4 degrees)
        const spreadRadians = (SHOOTER_SPREAD_ANGLE * Math.PI / 180);
        const randomSpread = (Math.random() - 0.5) * 2 * spreadRadians;
        const finalAngle = baseAngle + randomSpread;
        
        // Create bullet
        const bulletVx = Math.cos(finalAngle) * SHOOTER_BULLET_SPEED;
        const bulletVy = Math.sin(finalAngle) * SHOOTER_BULLET_SPEED;
        
        const bullet = new ShooterBullet(
            this.x, this.y, 
            bulletVx, bulletVy, 
            SHOOTER_BULLET_RADIUS, 
            1, // damage
            '#FF3B30', // red color
            this
        );
        
        projectiles.push(bullet);
    }
    
    render(ctx, imageLoader = null, player = null) {
        ctx.save();
        
        // Calculate rotation angle towards player or based on velocity
        let angle = 0;
        if (player) {
            angle = Math.atan2(player.y - this.y, player.x - this.x);
        } else {
            angle = Math.atan2(this.vy, this.vx);
        }
        
        // Try to use sprite first
        const shooterSprite = imageLoader?.getImage('shooter');
        if (shooterSprite) {
            // Translate to center and rotate
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            
            // Draw sprite with size = 2 * radius
            const size = this.radius * 2;
            ctx.drawImage(shooterSprite, -size/2, -size/2, size, size);
        } else {
            // Fallback to geometry rendering
            ctx.fillStyle = '#FF8800';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Tank enemy
export class Tank extends Enemy {
    constructor(x, y) {
        super(x, y, TANK_RADIUS, TANK_HP);
        this.speed = TANK_SPEED;
        this.contactCooldown = 0;
        this.flashTimer = 0;
        this.isFlashing = false;
        this.lastContactTime = 0;
    }
    
    update(deltaTime, player, bounds) {
        if (!player.isAlive()) return;
        
        this.contactCooldown -= deltaTime;
        this.flashTimer -= deltaTime;
        
        if (this.flashTimer <= 0) {
            this.isFlashing = false;
        }
        
        // Move towards player (slow pursuit)
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Utils.distance(this.x, this.y, player.x, player.y);
        
        if (distance > 0) {
            const normalized = Utils.normalize(dx, dy);
            this.vx = normalized.x * this.speed;
            this.vy = normalized.y * this.speed;
        } else {
            this.vx = 0;
            this.vy = 0;
        }
        
        super.update(deltaTime, player, bounds);
        
        // Keep in bounds
        this.x = Utils.clamp(this.x, this.radius, bounds.width - this.radius);
        this.y = Utils.clamp(this.y, this.radius, bounds.height - this.radius);
        
        // Check for contact damage
        if (this.contactCooldown <= 0 && player.canTakeDamage()) {
            const playerDistance = Utils.distance(this.x, this.y, player.x, player.y);
            if (playerDistance < this.radius + player.radius) {
                this.dealContactDamage(player);
            }
        }
    }
    
    dealContactDamage(player) {
        player.takeDamage(1);
        this.contactCooldown = TANK_CONTACT_COOLDOWN;
        
        // Apply knockback to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Utils.distance(this.x, this.y, player.x, player.y);
        
        if (distance > 0) {
            const normalized = Utils.normalize(dx, dy);
            player.x += normalized.x * TANK_KNOCKBACK;
            player.y += normalized.y * TANK_KNOCKBACK;
        }
    }
    
    takeDamage(damage) {
        super.takeDamage(damage);
        
        // Flash white when hit
        this.isFlashing = true;
        this.flashTimer = TANK_FLASH_DURATION;
    }
    
    render(ctx) {
        ctx.save();
        
        // Flash white when hit, otherwise dark red
        if (this.isFlashing) {
            ctx.fillStyle = '#FFFFFF';
        } else {
            ctx.fillStyle = '#880000';
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Base Weapon class
export class Weapon {
    constructor(fireRate, ammo = -1) {
        this.fireRate = fireRate; // seconds between shots
        this.ammo = ammo; // -1 for infinite
        this.currentAmmo = ammo;
        this.lastFireTime = 0;
        this.owner = null;
    }
    
    update(deltaTime) {
        // Override in subclasses if needed
    }
    
    canFire() {
        const now = Date.now() / 1000;
        const timeSinceLastFire = now - this.lastFireTime;
        return timeSinceLastFire >= this.fireRate && 
               (this.ammo === -1 || this.currentAmmo > 0);
    }
    
    fire(fromX, fromY, targetX, targetY, projectiles) {
        if (!this.canFire()) return false;
        
        const projectile = this.createProjectile(fromX, fromY, targetX, targetY);
        if (projectile) {
            projectiles.push(projectile);
            this.lastFireTime = Date.now() / 1000;
            
            if (this.ammo > 0) {
                this.currentAmmo--;
            }
            
            return true;
        }
        
        return false;
    }
    
    createProjectile(fromX, fromY, targetX, targetY) {
        // Override in subclasses
        return null;
    }
    
    getAmmoDisplay() {
        return this.ammo === -1 ? '∞' : this.currentAmmo.toString();
    }
    
    reload() {
        if (this.ammo > 0) {
            this.currentAmmo = this.ammo;
        }
    }
}

// Pistol weapon (implemented)
export class Pistol extends Weapon {
    constructor() {
        super(PISTOL_FIRE_RATE, -1); // 1 second fire rate, infinite ammo
    }
    
    createProjectile(fromX, fromY, targetX, targetY) {
        const dx = targetX - fromX;
        const dy = targetY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return null;
        
        const normalized = Utils.normalize(dx, dy);
        
        return new Projectile(
            fromX, fromY,
            normalized.x * BULLET_SPEED,
            normalized.y * BULLET_SPEED,
            BULLET_RADIUS,
            1, // damage
            '#FFFF00', // color
            'player'
        );
    }
}

// Machine Gun weapon
export class MachineGun extends Weapon {
    constructor() {
        super(MACHINE_GUN_FIRE_RATE, MACHINE_GUN_AMMO);
    }
    
    canFire() {
        const now = Date.now() / 1000;
        const canFireByTime = (now - this.lastFireTime) >= this.fireRate;
        const hasAmmo = this.currentAmmo > 0;
        return canFireByTime && hasAmmo;
    }
    
    createProjectile(fromX, fromY, targetX, targetY) {
        // Calculate direction
        const dx = targetX - fromX;
        const dy = targetY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return null;
        
        // Normalize and apply speed
        const vx = (dx / distance) * BULLET_SPEED;
        const vy = (dy / distance) * BULLET_SPEED;
        
        return new Projectile(
            fromX, fromY,
            vx, vy,
            BULLET_RADIUS,
            1, // damage
            '#4A90E2', // blue color to distinguish from pistol
            'player'
        );
    }
    
    getAmmoDisplay() {
        return this.currentAmmo.toString();
    }
}

// Base Projectile class
export class Projectile extends Entity {
    constructor(x, y, vx, vy, radius, damage, color, owner) {
        super(x, y, radius);
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.color = color;
        this.owner = owner;
        this.lifetime = 3.0; // seconds
        this.age = 0;
    }
    
    update(deltaTime, bounds) {
        super.update(deltaTime);
        this.age += deltaTime;
        
        // Remove if too old or out of bounds
        if (this.age >= this.lifetime ||
            this.x < -this.radius || this.x > bounds.width + this.radius ||
            this.y < -this.radius || this.y > bounds.height + this.radius) {
            this.alive = false;
        }
    }
    
    render(ctx, imageLoader = null) {
        ctx.save();
        
        // Try sprite rendering first
        if (imageLoader) {
            let spriteKey = null;
            
            // Determine sprite based on owner and color
            if (this.owner === 'player') {
                spriteKey = 'bullet_player';
            } else if (this.owner === 'shooter' || this.color === '#FF3B30') {
                spriteKey = 'bullet_shooter';
            }
            
            if (spriteKey) {
                const sprite = imageLoader.getImage(spriteKey);
                if (sprite) {
                    const size = 2 * this.radius;
                    
                    // Calculate rotation based on velocity
                    const angle = Math.atan2(this.vy, this.vx);
                    
                    ctx.translate(this.x, this.y);
                    ctx.rotate(angle);
                    ctx.drawImage(sprite, -size/2, -size/2, size, size);
                    ctx.restore();
                    return;
                }
            }
        }
        
        // Fallback to geometry rendering
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Enemy Registry
export const ENEMY_REGISTRY = {
    'assassin': Assassin,
    'shooter': Shooter,
    'tank': Tank
};

// Weapon Registry
export const WEAPON_REGISTRY = {
    'pistol': Pistol,
    'machine_gun': MachineGun
};

// ShooterBullet - enemy projectile with lifetime
export class ShooterBullet extends Projectile {
    constructor(x, y, vx, vy, radius, damage, color, owner) {
        super(x, y, vx, vy, radius, damage, color, owner);
        this.lifetime = SHOOTER_BULLET_LIFETIME; // Override parent's lifetime
        // Remove redundant age tracking - parent class handles it
    }
    
    // No need to override update - parent class handles lifetime properly
}