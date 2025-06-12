import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.inTitleScreen = true;
        this.menuIndex = 0;
        this.menuOptions = ['start', 'continue'];
        // Auto-attack system
        this.attackCooldown = 0;
        this.attackRate = 60; // frames per attack (1/sec at 60fps)
        this.attackDamage = 10;
        this.playerExp = 0;
        this.playerLevel = 1;
        this.nextLevelExp = 50;
        this.attackLines = [];
        this.attackLinePool = [];
    }

    preload() {
        // Create a simple pattern texture for the background
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0x222244, 1);
        graphics.fillRect(0, 0, 64, 64);
        graphics.lineStyle(2, 0x333366, 1);
        graphics.strokeRect(0, 0, 64, 64);
        graphics.lineBetween(0, 0, 64, 64);
        graphics.lineBetween(64, 0, 0, 64);
        graphics.generateTexture('bg-pattern', 64, 64);
    }

    create() {
        const gameWidth = this.scale.gameSize.width;
        const gameHeight = this.scale.gameSize.height;

        // Add background tile sprite
        this.bg = this.add.tileSprite(0, 0, gameWidth, gameHeight, 'bg-pattern').setOrigin(0);

        // Player is always centered
        this.player = this.add.circle(
            gameWidth / 2,
            gameHeight / 2,
            30,
            0x4CAF50
        );
        this.player.setDepth(1);

        // World offset (camera position)
        this.worldOffset = new Phaser.Math.Vector2(0, 0);

        // WASD keys
        this.cursors = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Touch controls
        this.touchStart = new Phaser.Math.Vector2();
        this.touchCurrent = new Phaser.Math.Vector2();
        this.isTouching = false;
        this.touchMoveVec = new Phaser.Math.Vector2();

        this.input.on('pointerdown', (pointer) => {
            this.touchStart.set(pointer.x, pointer.y);
            this.touchCurrent.set(pointer.x, pointer.y);
            this.isTouching = true;
        });
        this.input.on('pointermove', (pointer) => {
            if (this.isTouching) {
                this.touchCurrent.set(pointer.x, pointer.y);
            }
        });
        this.input.on('pointerup', () => {
            this.isTouching = false;
            this.touchMoveVec.set(0, 0);
        });

        // Touch indicator
        this.touchIndicator = this.add.circle(0, 0, 50, 0xffffff, 0.2);
        this.touchIndicator.setVisible(false);
        this.touchIndicator.setDepth(2);

        // Aiming line
        this.aimLine = this.add.line(0, 0, 0, 0, 60, 0, 0xffe066, 1).setOrigin(0, 0.5);
        this.aimLine.setDepth(2);
        this.aimLine.setVisible(false);

        // Player stats
        this.playerStats = {
            maxHP: 100,
            hp: 100
        };
        // Player shock state
        this.playerShockTimer = 0;
        this.playerFlashStep = 0;
        // Damage cooldown
        this.playerDamageCooldown = 0;

        // Enemies array
        this.npcEnemies = [];
        // Spawn timer
        this.time.addEvent({
            delay: 1200,
            loop: true,
            callback: () => {
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const distance = Math.max(this.scale.gameSize.width, this.scale.gameSize.height) * 0.6 + 80;
                const x = this.scale.gameSize.width / 2 + Math.cos(angle) * distance;
                const y = this.scale.gameSize.height / 2 + Math.sin(angle) * distance;
                const enemy = new NPCEnemy(this, x, y);
                this.npcEnemies.push(enemy);
            }
        });

        this.gameOver = false;
        this.inTitleScreen = true;
        this.menuIndex = 0;
        this.updateTitleScreen();
        this.setupMenuInput();
        this.attackCooldown = 0;
        this.attackRate = 60;
        this.attackDamage = 10;
        this.playerExp = 0;
        this.playerLevel = 1;
        this.nextLevelExp = 50;
        this.attackLines = [];
        this.attackLinePool = [];
    }

    update() {
        // --- Title Screen ---
        if (this.inTitleScreen) return;
        // --- Game Over Check ---
        if (this.gameOver) return;
        // --- Movement Vector ---
        let moveVec = new Phaser.Math.Vector2();
        // Keyboard
        if (this.cursors.left.isDown) moveVec.x -= 1;
        if (this.cursors.right.isDown) moveVec.x += 1;
        if (this.cursors.up.isDown) moveVec.y -= 1;
        if (this.cursors.down.isDown) moveVec.y += 1;
        // Touch
        if (this.isTouching) {
            this.touchIndicator.setPosition(this.touchStart.x, this.touchStart.y);
            this.touchIndicator.setVisible(true);
            this.touchMoveVec.copy(this.touchCurrent).subtract(this.touchStart);
            if (this.touchMoveVec.length() > 10) {
                moveVec.copy(this.touchMoveVec).normalize();
            }
        } else {
            this.touchIndicator.setVisible(false);
        }
        // Normalize for diagonal
        if (moveVec.length() > 0) moveVec = moveVec.normalize();

        // --- World Offset Update ---
        const speed = 4;
        this.worldOffset.x += moveVec.x * speed;
        this.worldOffset.y += moveVec.y * speed;

        // --- Background Scroll ---
        this.bg.tilePositionX = this.worldOffset.x;
        this.bg.tilePositionY = this.worldOffset.y;

        // --- Player stays centered ---
        // (No update needed, always at center)

        // --- Aiming Stroke ---
        if (moveVec.length() > 0) {
            this.aimLine.setVisible(true);
            const centerX = this.scale.gameSize.width / 2;
            const centerY = this.scale.gameSize.height / 2;
            this.aimLine.setPosition(centerX, centerY);
            // Calculate angle
            const angle = Math.atan2(moveVec.y, moveVec.x);
            this.aimLine.setRotation(angle);
        } else {
            this.aimLine.setVisible(false);
        }

        // --- Update HUD ---
        const hud = document.getElementById('hud');
        if (hud) {
            hud.textContent = `HP:${Math.round(this.playerStats.hp)}/${this.playerStats.maxHP}  LVL:${this.playerLevel}  EXP:${this.playerExp}/${this.nextLevelExp}`;
        }

        // --- NPC Enemies update ---
        const centerX = this.scale.gameSize.width / 2;
        const centerY = this.scale.gameSize.height / 2;
        for (const enemy of this.npcEnemies) {
            enemy.update(centerX, centerY);
        }

        // --- Enemy-Enemy Separation (Cluster Repulsion) ---
        for (let i = 0; i < this.npcEnemies.length; i++) {
            for (let j = i + 1; j < this.npcEnemies.length; j++) {
                const a = this.npcEnemies[i];
                const b = this.npcEnemies[j];
                const dx = b.sprite.x - a.sprite.x;
                const dy = b.sprite.y - a.sprite.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = a.radius + b.radius;
                if (dist < minDist && dist > 0) {
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    // Push both enemies away from each other
                    a.sprite.x -= nx * (overlap / 2);
                    a.sprite.y -= ny * (overlap / 2);
                    b.sprite.x += nx * (overlap / 2);
                    b.sprite.y += ny * (overlap / 2);
                }
            }
        }

        // --- Collision Detection, Damage, and Bounce (Player-Enemy) ---
        for (const enemy of this.npcEnemies) {
            const dx = enemy.sprite.x - centerX;
            const dy = enemy.sprite.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = enemy.radius + this.player.radius;
            if (dist < minDist) {
                // --- Bounce logic ---
                const overlap = minDist - dist;
                if (overlap > 0 && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    // Move enemy out
                    enemy.sprite.x += nx * overlap;
                    enemy.sprite.y += ny * overlap;
                    // Move player (by moving world offset in opposite direction)
                    this.worldOffset.x -= nx * overlap * 0.5;
                    this.worldOffset.y -= ny * overlap * 0.5;
                    this.bg.tilePositionX = this.worldOffset.x;
                    this.bg.tilePositionY = this.worldOffset.y;
                }
                // --- Damage logic ---
                if (this.playerShockTimer <= 0 && this.playerStats.hp > 0) {
                    this.playerStats.hp -= 0.7; // Damage per frame
                    this.playerShockTimer = 18; // Shorter flash for repeated hits
                    this.playerFlashStep = 0;
                }
            }
        }
        // --- Shock Animation ---
        if (this.playerShockTimer > 0) {
            this.playerShockTimer--;
            if (this.playerShockTimer % 6 < 3) {
                this.player.setFillStyle(0xffffff);
            } else {
                this.player.setFillStyle(0x4CAF50);
            }
            if (this.playerShockTimer === 0) {
                this.player.setFillStyle(0x4CAF50);
            }
        }

        // --- Game Over Trigger ---
        if (this.playerStats.hp <= 0 && !this.gameOver) {
            this.gameOver = true;
            this.showGameOver();
            setTimeout(() => this.showTitleScreen(), 2000);
        }

        // --- Auto-Attack ---
        if (!this.inTitleScreen && !this.gameOver && this.npcEnemies.length > 0) {
            if (this.attackCooldown > 0) {
                this.attackCooldown--;
            } else {
                // Find closest enemy within 60px
                const centerX = this.scale.gameSize.width / 2;
                const centerY = this.scale.gameSize.height / 2;
                let closest = null;
                let minDist = Infinity;
                for (const enemy of this.npcEnemies) {
                    if (enemy.isDead) continue;
                    const dx = enemy.sprite.x - centerX;
                    const dy = enemy.sprite.y - centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < minDist && dist <= 300) {
                        minDist = dist;
                        closest = enemy;
                    }
                }
                if (closest) {
                    closest.takeDamage(this.attackDamage);
                    this.attackCooldown = this.attackRate;
                    this.showAttackLine(centerX, centerY, closest.sprite.x, closest.sprite.y);
                }
            }
        }

        // --- Attack Line Animation ---
        for (let i = this.attackLines.length - 1; i >= 0; i--) {
            const line = this.attackLines[i];
            line.life--;
            if (line.life <= 0) {
                line.phaserLine.setVisible(false);
                this.attackLinePool.push(line.phaserLine);
                this.attackLines.splice(i, 1);
            }
        }

        // Remove dead enemies and grant EXP
        let expGained = 0;
        for (const enemy of this.npcEnemies) {
            if (enemy.toRemove && !enemy.expGiven) {
                expGained += 10;
                enemy.expGiven = true;
            }
        }
        if (expGained > 0) {
            this.playerExp += expGained;
        }

        // --- Level Up Logic ---
        while (this.playerExp >= this.nextLevelExp) {
            this.playerExp -= this.nextLevelExp;
            this.playerLevel++;
            this.attackDamage *= 2;
            this.nextLevelExp = 50 * this.playerLevel;
        }

        // Remove dead enemies
        this.npcEnemies = this.npcEnemies.filter(e => !e.toRemove);
    }

    showGameOver() {
        const gameover = document.getElementById('gameover');
        if (gameover) {
            gameover.style.display = 'flex';
        }
    }

    showTitleScreen() {
        this.inTitleScreen = true;
        this.gameOver = false;
        const gameover = document.getElementById('gameover');
        if (gameover) gameover.style.display = 'none';
        this.updateTitleScreen();
    }

    updateTitleScreen() {
        const title = document.getElementById('titlescreen');
        if (title) title.style.display = this.inTitleScreen ? 'flex' : 'none';
        // Highlight selected option
        const opts = ['startbtn', 'continuebtn'];
        opts.forEach((id, idx) => {
            const el = document.getElementById(id);
            if (el) {
                if (idx === this.menuIndex) {
                    el.classList.add('selected');
                    el.style.background = '#fff8';
                    el.style.color = '#222';
                } else {
                    el.classList.remove('selected');
                    el.style.background = '#fff1';
                    el.style.color = '#fff';
                }
            }
        });
    }

    setupMenuInput() {
        // Keyboard
        this.input.keyboard.on('keydown', (e) => {
            if (!this.inTitleScreen) return;
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.menuIndex = (this.menuIndex + this.menuOptions.length - 1) % this.menuOptions.length;
                this.updateTitleScreen();
            } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.menuIndex = (this.menuIndex + 1) % this.menuOptions.length;
                this.updateTitleScreen();
            } else if (e.code === 'Enter' || e.code === 'Space') {
                this.selectMenuOption();
            }
        });
        // Touch/click
        ['startbtn', 'continuebtn'].forEach((id, idx) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('pointerdown', () => {
                    this.menuIndex = idx;
                    this.updateTitleScreen();
                    this.selectMenuOption();
                });
            }
        });
    }

    selectMenuOption() {
        if (this.menuOptions[this.menuIndex] === 'start') {
            this.startGame();
        } else if (this.menuOptions[this.menuIndex] === 'continue') {
            // Placeholder: could load game state
            this.startGame();
        }
    }

    startGame() {
        // Reset all game state
        this.inTitleScreen = false;
        this.gameOver = false;
        this.playerStats.hp = this.playerStats.maxHP;
        // Remove all enemies
        for (const enemy of this.npcEnemies) {
            enemy.sprite.destroy();
        }
        this.npcEnemies = [];
        // Reset world offset
        this.worldOffset.set(0, 0);
        this.bg.tilePositionX = 0;
        this.bg.tilePositionY = 0;
        // Hide overlays
        const title = document.getElementById('titlescreen');
        if (title) title.style.display = 'none';
        const gameover = document.getElementById('gameover');
        if (gameover) gameover.style.display = 'none';
        this.playerExp = 0;
        this.playerLevel = 1;
        this.nextLevelExp = 50;
        this.attackDamage = 10;
    }

    showAttackLine(x1, y1, x2, y2) {
        let lineObj;
        if (this.attackLinePool.length > 0) {
            lineObj = this.attackLinePool.pop();
            lineObj.setTo(x1, y1, x2, y2);
            lineObj.setVisible(true);
        } else {
            lineObj = this.add.line(0, 0, x1, y1, x2, y2, 0xfff200, 1).setOrigin(0, 0);
            lineObj.setLineWidth(6, 6);
            lineObj.setDepth(3);
        }
        this.attackLines.push({ phaserLine: lineObj, life: 8 }); // 8 frames
    }
}

class NPCEnemy {
    constructor(scene, x, y) {
        this.scene = scene;
        this.radius = 30;
        this.speed = 1.5;
        this.sprite = scene.add.circle(x, y, this.radius, 0xff8800);
        this.sprite.setDepth(1);
        this.stats = {
            maxHP: 20,
            hp: 20
        };
        this.isDead = false;
        this.deathAnimTimer = 0;
        this.expGiven = false;
    }

    update(targetX, targetY) {
        if (this.isDead) {
            // Death animation: shake and blink
            this.deathAnimTimer++;
            if (this.deathAnimTimer < 24) {
                // Shake
                this.sprite.x += Math.sin(this.deathAnimTimer * 2) * 2;
                this.sprite.y += Math.cos(this.deathAnimTimer * 3) * 2;
                // Blink
                if (this.deathAnimTimer % 6 < 3) {
                    this.sprite.setFillStyle(0xffffff);
                } else {
                    this.sprite.setFillStyle(0xff8800);
                }
            } else {
                this.sprite.destroy();
                this.toRemove = true;
            }
            return;
        }
        // Move towards target (player center)
        const dx = targetX - this.sprite.x;
        const dy = targetY - this.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
            this.sprite.x += (dx / dist) * this.speed;
            this.sprite.y += (dy / dist) * this.speed;
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.stats.hp -= amount;
        if (this.stats.hp <= 0) {
            this.stats.hp = 0;
            this.isDead = true;
            this.deathAnimTimer = 0;
        } else {
            // Flash white briefly on hit
            this.sprite.setFillStyle(0xffffff);
            setTimeout(() => {
                if (!this.isDead) this.sprite.setFillStyle(0xff8800);
            }, 100);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#2a2a2a',
    scene: MainScene,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: window.innerWidth,
        height: window.innerHeight,
        min: {
            width: 300,
            height: 300
        }
    },
    input: {
        activePointers: 1
    }
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
