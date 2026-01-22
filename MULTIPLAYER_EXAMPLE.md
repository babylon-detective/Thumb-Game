# Multiplayer Implementation Examples

## Complete Integration Example

This shows how multiplayer is integrated into the main game scene.

### 1. Initialize Multiplayer (in `create()`)

```javascript
// Initialize multiplayer system
this.multiplayerManager = new MultiplayerManager({
    playerName: this.getPlayerName()
});

await this.multiplayerManager.init();

// Setup event listeners
this.multiplayerManager.on('remotePlayerAdded', (data) => {
    this.handleRemotePlayerAdded(data);
});

this.multiplayerManager.on('remotePlayerUpdated', (data) => {
    this.handleRemotePlayerUpdated(data);
});

this.multiplayerManager.on('playerRemoved', (data) => {
    this.handlePlayerRemoved(data);
});
```

### 2. Handle Remote Player Events

```javascript
handleRemotePlayerAdded(data) {
    const remotePlayer = new PlayerModule(this, data.playerId, {
        ...data.playerData,
        isLocal: false
    });
    remotePlayer.create();
    this.remotePlayersMap.set(data.playerId, remotePlayer);
    this.playerRegistry.register(remotePlayer);
    console.log(`${data.playerData.name} joined the arena!`);
}

handleRemotePlayerUpdated(data) {
    const remotePlayer = this.remotePlayersMap.get(data.playerId);
    if (remotePlayer) {
        remotePlayer.setState(data.player);
    }
}

handlePlayerRemoved(data) {
    const remotePlayer = this.remotePlayersMap.get(data.playerId);
    if (remotePlayer) {
        remotePlayer.destroy();
        this.remotePlayersMap.delete(data.playerId);
        this.playerRegistry.unregister(data.playerId);
    }
}
```

### 3. Update Local Player State (in `update()`)

```javascript
// Each frame, broadcast local player state to other players
if (this.isMultiplayer && this.multiplayerManager && !this.gameOver) {
    this.multiplayerManager.broadcastState({
        x: this.player.x,
        y: this.player.y,
        hp: this.playerStats.hp,
        level: this.playerLevel,
        exp: this.playerExp,
        isDead: this.playerStats.hp <= 0
    });
}
```

### 4. Update Remote Players (in `update()`)

```javascript
// Update all remote players
for (const [playerId, remotePlayer] of this.remotePlayersMap) {
    if (!remotePlayer.isDead) {
        remotePlayer.update();
        
        // Check collision with enemies
        for (const enemy of this.npcEnemies) {
            if (remotePlayer.checkCollision(enemy)) {
                remotePlayer.resolveCollision(enemy);
                remotePlayer.takeDamage(0.7);
            }
        }
    }
}
```

### 5. Sync Arena View

```javascript
// All players see the same arena
// Remote players are drawn at their world positions
// The world moves relative to the local player (always centered)

// In render loop:
for (const [playerId, remotePlayer] of this.remotePlayersMap) {
    // Sprite positions already set in player.update()
    // But you can adjust for camera/world offset
    remotePlayer.sprite.setPosition(
        remotePlayer.x,
        remotePlayer.y
    );
}
```

## Usage Patterns

### Pattern 1: Checking for Other Players

```javascript
// Get all players in the arena
const allPlayers = this.multiplayerManager.getAllPlayers();

// Get just the remote players
const remotePlayers = this.multiplayerManager.getRemotePlayers();

// Get local player
const localPlayer = this.multiplayerManager.getLocalPlayer();

console.log(`Total players: ${allPlayers.length}`);
console.log(`Remote players: ${remotePlayers.length}`);
```

### Pattern 2: Player-to-Player Interaction

```javascript
// Check if two players collide
const localPlayerModule = this.remotePlayersMap.get(this.multiplayerManager.playerId);

for (const [playerId, remotePlayer] of this.remotePlayersMap) {
    if (localPlayerModule.checkCollision(remotePlayer)) {
        // Players collided!
        localPlayerModule.resolveCollision(remotePlayer);
        
        // Could add team/damage mechanics here
    }
}
```

### Pattern 3: Multiplayer HUD

```javascript
// Update HUD with multiplayer info
updateMultiplayerHUD() {
    const hud = document.getElementById('hud');
    const playerCount = this.remotePlayersMap.size + 1;
    const playerId = this.multiplayerManager.playerId.substring(0, 8);
    
    hud.innerHTML = `
        HP: ${Math.round(this.playerStats.hp)}/${this.playerStats.maxHP} |
        LVL: ${this.playerLevel} |
        EXP: ${this.playerExp}/${this.nextLevelExp} |
        Players: ${playerCount} |
        ID: ${playerId}...
    `;
}
```

### Pattern 4: Custom Player Colors

```javascript
// Each player gets a unique color automatically
// You can customize this:

const colors = {
    'Alice': 0xFF5733,
    'Bob': 0x33FF57,
    'Charlie': 0x3357FF
};

// When creating remote player
const remotePlayer = new PlayerModule(this, data.playerId, {
    ...data.playerData,
    color: colors[data.playerData.name] || data.playerData.color,
    isLocal: false
});
```

## Integration with Existing Game Systems

### With Enemy Spawning

```javascript
// Enemies can still spawn for all players
// But damage is individual (each player's attacks hurt their own copy)

if (this.npcEnemies.length > 0) {
    // Each player auto-attacks independently
    for (const enemy of this.npcEnemies) {
        this.localPlayer.autoAttack(enemy);
        
        // Remote players auto-attack too
        for (const [playerId, remotePlayer] of this.remotePlayersMap) {
            remotePlayer.autoAttack(enemy);
        }
    }
}
```

### With Experience & Leveling

```javascript
// When enemies die, all players who damaged them get XP
// In a real scenario, you'd want damage tracking

when_enemy_dies(enemy) {
    // All players who attacked get XP
    this.localPlayer.addExp(10);
    
    for (const [playerId, remotePlayer] of this.remotePlayersMap) {
        remotePlayer.addExp(10);
    }
}
```

### With Game Over

```javascript
if (this.playerStats.hp <= 0 && !this.gameOver) {
    this.gameOver = true;
    
    // Notify other players
    this.multiplayerManager.broadcastState({
        isDead: true,
        hp: 0
    });
    
    this.showGameOver();
    setTimeout(() => this.showTitleScreen(), 2000);
}
```

## URL-Based Player Creation

### Sharing the Game URL

To let multiple players join with unique identities via URL:

```
# Default (generates random name)
http://localhost:3000

# With player name
http://localhost:3000/?playerName=Alice
http://localhost:3000/?playerName=Bob
http://localhost:3000/?playerName=Charlie

# Copy the URL to share with other players
```

### Getting Player Name from URL

```javascript
getPlayerName() {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('playerName');
    
    if (name) {
        return name;
    }
    
    // Generate random name if not provided
    return `Player_${Math.random().toString(36).substr(2, 9)}`;
}
```

## Testing Multiplayer Locally

### Method 1: Multiple Browser Tabs

```
1. Open Tab 1: http://localhost:3000/?playerName=Player1
2. Open Tab 2: http://localhost:3000/?playerName=Player2
3. Both tabs show multiplayer info
4. You can test interactions between players
```

### Method 2: Multiple Windows

```
1. npm run dev (start dev server)
2. Open http://localhost:3000/?playerName=Alice in Window 1
3. Open http://localhost:3000/?playerName=Bob in Window 2
4. Test player movement and interactions
```

### Method 3: Network Testing

```
1. Get your local IP: ifconfig (Mac/Linux) or ipconfig (Windows)
2. Tell others to visit: http://YOUR_IP:3000/?playerName=TheirName
3. You can all play together!
```

## Common Issues & Solutions

### Issue: Remote players not appearing

```javascript
// Debug in browser console:
console.log(this.multiplayerManager.getAllPlayers());
console.log(this.remotePlayersMap);
```

### Issue: State not updating

```javascript
// Make sure you're broadcasting each frame:
// Add to update() method:
if (this.isMultiplayer) {
    this.multiplayerManager.broadcastState({
        x: this.player.x,
        y: this.player.y,
        hp: this.playerStats.hp
    });
}
```

### Issue: Event listeners not firing

```javascript
// Check that listeners are registered:
console.log(this.multiplayerManager.listeners);

// Make sure init() is called with await:
await this.multiplayerManager.init();
```

## Next Steps

1. **Connect to Backend**: Replace event emitters with WebSocket communication
2. **Add Persistence**: Use `PlayerDataStore` to save player progress
3. **Implement Shared Enemies**: Enemies that all players see and damage together
4. **Add Chat**: Text communication between players
5. **Player Synchronization**: Smooth interpolation of remote player positions

See `MULTIPLAYER_GUIDE.md` for complete API reference.







