# Multiplayer Quick Reference

## 🚀 Quick Start

```javascript
// In MainScene.create():
this.multiplayerManager = new MultiplayerManager({
    playerName: 'PlayerName'
});
await this.multiplayerManager.init();

// Listen for events
this.multiplayerManager.on('remotePlayerAdded', (data) => {
    // A new player joined!
});
```

## 📡 Core Objects

### MultiplayerManager
Central hub for all multiplayer coordination.

```javascript
// Create
const mgr = new MultiplayerManager(options);

// Player queries
mgr.getLocalPlayer()          // Get this player
mgr.getRemotePlayers()        // Get all others
mgr.getAllPlayers()           // Get everyone
mgr.getPlayer(playerId)       // Get specific player

// Updates
mgr.updateLocalPlayer(state)  // Send your state
mgr.broadcastState(state)     // Broadcast to all

// Events
mgr.on(event, callback)       // Subscribe
mgr.emit(event, data)         // Send event
```

### PlayerModule
Individual player with game logic.

```javascript
// Create
const player = new PlayerModule(scene, id, config);
player.create();

// Each frame
player.update();

// Actions
player.moveTo(x, y)
player.takeDamage(10)
player.addExp(50)
player.levelUp()
player.autoAttack(target)

// Collision
player.checkCollision(other)
player.resolveCollision(other)

// State
player.getState()
player.setState(state)
```

### PlayerRegistry
Manage multiple players.

```javascript
const registry = new PlayerRegistry();

// Add/Remove
registry.register(player)
registry.unregister(playerId)

// Query
registry.get(playerId)
registry.getAll()
registry.getActive()
registry.getDead()

// Batch
registry.updateAll(deltaTime)
registry.clear()
```

## 📍 Events

```javascript
// Remote player joined
mgr.on('remotePlayerAdded', ({playerId, playerData}) => {});

// Remote player updated
mgr.on('remotePlayerUpdated', ({playerId, player}) => {});

// Player left
mgr.on('playerRemoved', ({playerId, player}) => {});

// Your state updated
mgr.on('localPlayerUpdated', (player) => {});

// Heartbeat (connection check)
mgr.on('heartbeat', (data) => {});
```

## 🎮 Game Integration

### In create():
```javascript
this.multiplayerManager = new MultiplayerManager({
    playerName: this.getPlayerName()
});
await this.multiplayerManager.init();

this.multiplayerManager.on('remotePlayerAdded', (data) => {
    const player = new PlayerModule(this, data.playerId, {
        ...data.playerData,
        isLocal: false
    });
    player.create();
    this.remotePlayersMap.set(data.playerId, player);
});
```

### In update():
```javascript
// Broadcast your state every frame
if (this.isMultiplayer) {
    this.multiplayerManager.broadcastState({
        x: this.player.x,
        y: this.player.y,
        hp: this.playerStats.hp,
        level: this.playerLevel
    });
}

// Update remote players
for (const [id, player] of this.remotePlayersMap) {
    player.update();
}
```

## 🌐 URL Parameters

```bash
# Generate random name
http://localhost:3000

# Set player name
http://localhost:3000/?playerName=Alice

# Share with others
http://YOUR_IP:3000/?playerName=Bob
```

## 💾 Data Storage

```javascript
const store = new PlayerDataStore();

// Save
store.savePlayer(playerId, {
    name: 'Alice',
    level: 5,
    exp: 250
});

// Load
const data = store.loadPlayer(playerId);

// Get all
const allData = store.getAllPlayers();

// Clear
store.clearAll();
```

## 🎨 Player Config

```javascript
{
    name: 'PlayerName',
    color: 0xFF5733,
    radius: 30,
    x: 0, y: 0,
    hp: 100,
    maxHP: 100,
    level: 1,
    exp: 0,
    nextLevelExp: 50,
    attackDamage: 10,
    attackRate: 60,
    attackRange: 300
}
```

## 🔧 Common Patterns

### Get all players in game
```javascript
const all = this.multiplayerManager.getAllPlayers();
const remote = this.multiplayerManager.getRemotePlayers();
```

### Update HUD with player count
```javascript
const count = this.remotePlayersMap.size + 1;
hud.textContent = `Players: ${count}`;
```

### Check if multiplayer active
```javascript
if (this.isMultiplayer && this.multiplayerManager) {
    // Multiplayer specific logic
}
```

### Handle player disconnect
```javascript
mgr.on('playerRemoved', (data) => {
    console.log(`${data.player.name} left`);
});
```

### Sync player position
```javascript
const player = mgr.getLocalPlayer();
mgr.updateLocalPlayer({
    x: this.player.x,
    y: this.player.y
});
```

## 🐛 Debug

```javascript
// Check player ID
console.log(this.multiplayerManager.playerId);

// List all players
console.log(this.multiplayerManager.getAllPlayers());

// Check listeners
console.log(this.multiplayerManager.listeners);

// Remote players
console.log(this.remotePlayersMap);
```

## ⚡ Performance Tips

1. Only broadcast state when it changes (not every frame)
2. Throttle broadcast to 10-20 times per second
3. Use delta compression (only send changed fields)
4. Batch updates for multiple remote players
5. Clean up listeners when not needed

```javascript
// Throttled broadcast
if (this.frameCount % 6 === 0) { // ~10 times/sec at 60 FPS
    mgr.broadcastState(state);
}
```

## 📚 Learn More

- `MULTIPLAYER_GUIDE.md` - Full technical reference
- `MULTIPLAYER_EXAMPLE.md` - Code examples
- `MULTIPLAYER_SETUP.md` - Complete setup guide
- Inline JSDoc in source files

## ✅ Checklist

- [ ] Initialize manager in `create()`
- [ ] Register event listeners
- [ ] Create PlayerModule for each remote player
- [ ] Add to registry
- [ ] Broadcast state each frame
- [ ] Update remote players each frame
- [ ] Display multiplayer info in HUD
- [ ] Test with multiple players

---

**Need help?** Check the documentation files or look at inline JSDoc comments in the source code.







