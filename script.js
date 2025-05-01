import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Load any assets here
    }

    create() {
        // Get the actual game dimensions
        const gameWidth = this.scale.gameSize.width;
        const gameHeight = this.scale.gameSize.height;

        // Create player
        this.player = this.add.circle(
            gameWidth / 2,
            gameHeight / 2,
            30,
            0x4CAF50
        );

        // Set up touch controls
        this.touchStart = new Phaser.Math.Vector2();
        this.touchCurrent = new Phaser.Math.Vector2();
        this.isTouching = false;

        // Touch input handling
        this.input.on('pointerdown', (pointer) => {
            this.touchStart.set(pointer.x, pointer.y);
            this.isTouching = true;
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isTouching) {
                this.touchCurrent.set(pointer.x, pointer.y);
            }
        });

        this.input.on('pointerup', () => {
            this.isTouching = false;
        });

        // Create touch indicator
        this.touchIndicator = this.add.circle(0, 0, 50, 0xffffff, 0.2);
        this.touchIndicator.setVisible(false);

        // Debug text
        this.debugText = this.add.text(10, 10, '', { 
            font: '16px Arial', 
            fill: '#ffffff' 
        });

        // Draw the game boundaries for debugging
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xff0000, 0.5);
        graphics.strokeRect(0, 0, gameWidth, gameHeight);
    }

    update() {
        if (this.isTouching) {
            // Update touch indicator position
            this.touchIndicator.setPosition(this.touchStart.x, this.touchStart.y);
            this.touchIndicator.setVisible(true);

            // Calculate movement
            const dx = this.touchCurrent.x - this.touchStart.x;
            const dy = this.touchCurrent.y - this.touchStart.y;

            // Move player
            this.player.x += dx * 0.1;
            this.player.y += dy * 0.1;

            // Keep player within bounds with a small margin
            const margin = 5;
            const radius = 30;
            this.player.x = Phaser.Math.Clamp(
                this.player.x,
                radius + margin,
                this.scale.gameSize.width - radius - margin
            );
            this.player.y = Phaser.Math.Clamp(
                this.player.y,
                radius + margin,
                this.scale.gameSize.height - radius - margin
            );
        } else {
            this.touchIndicator.setVisible(false);
        }

        // Update debug text
        this.debugText.setText([
            `Player X: ${Math.round(this.player.x)}`,
            `Player Y: ${Math.round(this.player.y)}`,
            `Game Width: ${this.scale.gameSize.width}`,
            `Game Height: ${this.scale.gameSize.height}`,
            `Viewport Width: ${window.innerWidth}`,
            `Viewport Height: ${window.innerHeight}`,
            `Touch Start: (${Math.round(this.touchStart.x)}, ${Math.round(this.touchStart.y)})`,
            `Touch Current: (${Math.round(this.touchCurrent.x)}, ${Math.round(this.touchCurrent.y)})`
        ].join('\n'));
    }
}

// Game configuration
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

// Create the game instance
const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
