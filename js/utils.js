// Utility functions for game mechanics

// Vector operations
export function normalizeVector(x, y) {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
}

export function vectorLength(x, y) {
    return Math.sqrt(x * x + y * y);
}

export function vectorDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

export function vectorAngle(x, y) {
    return Math.atan2(y, x);
}

export function angleToVector(angle) {
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

// Collision detection
export function checkCircleCollision(x1, y1, r1, x2, y2, r2) {
    const distance = vectorDistance(x1, y1, x2, y2);
    return distance < (r1 + r2);
}

export function checkPointInCircle(px, py, cx, cy, radius) {
    return vectorDistance(px, py, cx, cy) <= radius;
}

export function checkRectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// Boundary checking
export function clampToBounds(x, y, minX, minY, maxX, maxY) {
    return {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y))
    };
}

export function isInBounds(x, y, minX, minY, maxX, maxY) {
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

// Random utilities
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Get random position on arena edge
export function getRandomEdgePosition(arenaWidth, arenaHeight, margin = 0) {
    const edge = randomInt(0, 3); // 0: top, 1: right, 2: bottom, 3: left
    
    switch (edge) {
        case 0: // top
            return { x: randomFloat(margin, arenaWidth - margin), y: margin };
        case 1: // right
            return { x: arenaWidth - margin, y: randomFloat(margin, arenaHeight - margin) };
        case 2: // bottom
            return { x: randomFloat(margin, arenaWidth - margin), y: arenaHeight - margin };
        case 3: // left
            return { x: margin, y: randomFloat(margin, arenaHeight - margin) };
        default:
            return { x: arenaWidth / 2, y: arenaHeight / 2 };
    }
}

// Interpolation
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// Timing utilities
export function createTimer(duration) {
    return {
        duration,
        elapsed: 0,
        isComplete: false,
        update(dt) {
            if (!this.isComplete) {
                this.elapsed += dt;
                if (this.elapsed >= this.duration) {
                    this.isComplete = true;
                    this.elapsed = this.duration;
                }
            }
        },
        reset() {
            this.elapsed = 0;
            this.isComplete = false;
        },
        getProgress() {
            return Math.min(1, this.elapsed / this.duration);
        }
    };
}

// Color utilities
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function colorWithAlpha(color, alpha) {
    const rgb = hexToRgb(color);
    if (rgb) {
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
    return color;
}

// Performance utilities
export function createObjectPool(createFn, resetFn, initialSize = 10) {
    const pool = [];
    const active = [];
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
        pool.push(createFn());
    }
    
    return {
        get() {
            let obj = pool.pop();
            if (!obj) {
                obj = createFn();
            }
            active.push(obj);
            return obj;
        },
        
        release(obj) {
            const index = active.indexOf(obj);
            if (index !== -1) {
                active.splice(index, 1);
                resetFn(obj);
                pool.push(obj);
            }
        },
        
        releaseAll() {
            while (active.length > 0) {
                const obj = active.pop();
                resetFn(obj);
                pool.push(obj);
            }
        },
        
        getActiveCount() {
            return active.length;
        },
        
        getPoolSize() {
            return pool.length;
        }
    };
}

// Debug utilities
export function drawDebugCircle(ctx, x, y, radius, color = '#ff0000') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

export function drawDebugRect(ctx, x, y, width, height, color = '#ff0000') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
}

export function drawDebugLine(ctx, x1, y1, x2, y2, color = '#ff0000') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}