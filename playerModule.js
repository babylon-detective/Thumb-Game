/**
 * Player Module
 * Represents a unique player in the shared arena
 * Can be used for both local player and remote players
 */

export class PlayerModule {
    constructor(scene, playerId, config = {}) {
        this.scene = scene;
        this.playerId = playerId;
        this.name = config.name || playerId;
        this.isLocal = config.isLocal || false;
        
        // Visual representation
        this.sprite = null;
        this.color = config.color || 0x4CAF50;
        this.radius = config.radius || 30;
        
        // Position (world space, not screen space)
        this.x = config.x || 0;
        this.y = config.y || 0;
        
        // Stats
        this.stats = {
            maxHP: config.maxHP || 100,
            hp: config.hp || 100
        };
        this.level = config.level || 1;
        this.exp = config.exp || 0;
        this.nextLevelExp = config.nextLevelExp || 50;
        
        // Combat
        this.attackCooldown = 0;
        this.attackRate = config.attackRate || 60;
        this.attackDamage = config.attackDamage || 10;
        this.attackRange = config.attackRange || 300;
        
        // State
        this.isDead = false;
        this.isActive = true;
        this.velocity = { x: 0, y: 0 };
        
        // Animations
        this.shockTimer = 0;
        this.deathAnimTimer = 0;
        
        // Metadata
        this.createdAt = Date.now();
        this.lastUpdated = Date.now();
    }

    /**
     * Initialize the player's visual representation
     */
    create() {
        if (!this.scene) return;
        
        this.sprite = this.scene.add.circle(
            this.x,
            this.y,
            this.radius,
            this.color
        );
        this.sprite.setDepth(1);
        this.sprite.setData('playerId', this.playerId);
        this.sprite.setData('playerModule', this);
    }

    /**
     * Update player state
     * For remote players, use this to sync state from server
     * For local players, this is called every frame
     */
    update(deltaTime = 1) {
        if (!this.sprite || this.isDead) return;

        // Update sprite position
        this.sprite.setPosition(this.x, this.y);

        // Reduce cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // Update shock animation
        if (this.shockTimer > 0) {
            this.shockTimer--;
            if (this.shockTimer % 6 < 3) {
                this.sprite.setFillStyle(0xffffff);
            } else {
                this.sprite.setFillStyle(this.color);
            }
            if (this.shockTimer === 0) {
                this.sprite.setFillStyle(this.color);
            }
        }
    }

    /**
     * Move the player
     */
    moveTo(x, y, delta = 1) {
        this.x = x;
        this.y = y;
        this.lastUpdated = Date.now();
    }

    /**
     * Apply velocity-based movement (for local player)
     */
    applyVelocity(speed = 4) {
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            this.x += this.velocity.x * speed;
            this.y += this.velocity.y * speed;
            this.lastUpdated = Date.now();
        }
    }

    /**
     * Set velocity
     */
    setVelocity(x, y) {
        this.velocity.x = x;
        this.velocity.y = y;
    }

    /**
     * Take damage
     */
    takeDamage(amount) {
        if (this.isDead) return;
        
        this.stats.hp -= amount;
        if (this.stats.hp <= 0) {
            this.stats.hp = 0;
            this.die();
        } else {
            this.shockTimer = 18;
            if (this.sprite) {
                this.sprite.setFillStyle(0xffffff);
            }
        }
        this.lastUpdated = Date.now();
    }

    /**
     * Heal the player
     */
    heal(amount) {
        if (this.isDead) return;
        
        this.stats.hp = Math.min(this.stats.hp + amount, this.stats.maxHP);
        this.lastUpdated = Date.now();
    }

    /**
     * Add experience
     */
    addExp(amount) {
        this.exp += amount;
        this.lastUpdated = Date.now();

        // Check for level up
        while (this.exp >= this.nextLevelExp) {
            this.levelUp();
        }
    }

    /**
     * Level up the player
     */
    levelUp() {
        this.level++;
        this.exp -= this.nextLevelExp;
        this.nextLevelExp = Math.floor(50 * this.level);
        this.attackDamage *= 1.5;
        this.stats.maxHP = Math.floor(100 + (20 * (this.level - 1)));
        this.stats.hp = this.stats.maxHP;
        this.lastUpdated = Date.now();
    }

    /**
     * Mark player as dead
     */
    die() {
        this.isDead = true;
        this.isActive = false;
        this.deathAnimTimer = 0;
        this.lastUpdated = Date.now();
    }

    /**
     * Update death animation
     */
    updateDeathAnimation() {
        if (!this.isDead || !this.sprite) return;

        this.deathAnimTimer++;
        if (this.deathAnimTimer < 24) {
            // Shake and blink
            this.sprite.x += Math.sin(this.deathAnimTimer * 2) * 2;
            this.sprite.y += Math.cos(this.deathAnimTimer * 3) * 2;
            if (this.deathAnimTimer % 6 < 3) {
                this.sprite.setFillStyle(0xffffff);
            } else {
                this.sprite.setFillStyle(this.color);
            }
        } else {
            this.destroy();
        }
    }

    /**
     * Perform auto-attack on a target
     */
    autoAttack(target) {
        if (this.isDead || this.stats.hp <= 0) return false;
        if (this.attackCooldown > 0) return false;

        // Calculate distance to target
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= this.attackRange) {
            target.takeDamage(this.attackDamage);
            this.attackCooldown = this.attackRate;
            this.lastUpdated = Date.now();
            return true;
        }
        return false;
    }

    /**
     * Check collision with another player
     */
    checkCollision(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.radius + other.radius;
        
        return dist < minDist;
    }

    /**
     * Resolve collision with another player
     */
    resolveCollision(other, pushForce = 0.5) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.radius + other.radius;

        if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            if (this.isLocal) {
                // For local player, push the other player
                other.x += nx * overlap * pushForce;
                other.y += ny * overlap * pushForce;
            } else if (other.isLocal) {
                // If other is local, push this player
                this.x -= nx * overlap * pushForce;
                this.y -= ny * overlap * pushForce;
            } else {
                // Both remote: push both away equally
                this.x -= nx * (overlap / 2) * pushForce;
                this.y -= ny * (overlap / 2) * pushForce;
                other.x += nx * (overlap / 2) * pushForce;
                other.y += ny * (overlap / 2) * pushForce;
            }
        }
    }

    /**
     * Get player state for serialization
     */
    getState() {
        return {
            playerId: this.playerId,
            name: this.name,
            x: this.x,
            y: this.y,
            hp: this.stats.hp,
            maxHp: this.stats.maxHP,
            level: this.level,
            exp: this.exp,
            nextLevelExp: this.nextLevelExp,
            attackDamage: this.attackDamage,
            isDead: this.isDead,
            isActive: this.isActive,
            color: this.color
        };
    }

    /**
     * Update from serialized state
     */
    setState(state) {
        if (state.x !== undefined) this.x = state.x;
        if (state.y !== undefined) this.y = state.y;
        if (state.hp !== undefined) this.stats.hp = state.hp;
        if (state.maxHp !== undefined) this.stats.maxHP = state.maxHp;
        if (state.level !== undefined) this.level = state.level;
        if (state.exp !== undefined) this.exp = state.exp;
        if (state.nextLevelExp !== undefined) this.nextLevelExp = state.nextLevelExp;
        if (state.attackDamage !== undefined) this.attackDamage = state.attackDamage;
        if (state.isDead !== undefined) this.isDead = state.isDead;
        if (state.isActive !== undefined) this.isActive = state.isActive;
        
        this.lastUpdated = Date.now();
    }

    /**
     * Draw nameplate above player
     */
    drawNameplate(scene) {
        if (!this.sprite) return;
        
        const text = scene.add.text(this.x, this.y - this.radius - 20, this.name, {
            font: 'bold 12px Arial',
            fill: '#ffffff',
            align: 'center'
        });
        text.setOrigin(0.5, 1);
        text.setDepth(2);
        return text;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
        this.isActive = false;
    }
}

/**
 * Container for managing multiple players
 */
export class PlayerRegistry {
    constructor() {
        this.players = new Map();
    }

    /**
     * Register a player
     */
    register(player) {
        this.players.set(player.playerId, player);
    }

    /**
     * Unregister a player
     */
    unregister(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.destroy();
            this.players.delete(playerId);
        }
    }

    /**
     * Get a player by ID
     */
    get(playerId) {
        return this.players.get(playerId);
    }

    /**
     * Get all players
     */
    getAll() {
        return Array.from(this.players.values());
    }

    /**
     * Get all active players
     */
    getActive() {
        return this.getAll().filter(p => p.isActive);
    }

    /**
     * Get all dead players
     */
    getDead() {
        return this.getAll().filter(p => p.isDead);
    }

    /**
     * Update all players
     */
    updateAll(deltaTime) {
        this.getAll().forEach(player => {
            if (player.isDead) {
                player.updateDeathAnimation();
            } else {
                player.update(deltaTime);
            }
        });
    }

    /**
     * Clear all players
     */
    clear() {
        this.getAll().forEach(player => player.destroy());
        this.players.clear();
    }

    /**
     * Get player count
     */
    count() {
        return this.players.size;
    }

    /**
     * Check if player exists
     */
    exists(playerId) {
        return this.players.has(playerId);
    }
}







