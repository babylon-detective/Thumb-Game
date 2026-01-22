# Multiplayer System Guide

## Overview

The Thumb Game now supports multiplayer functionality, allowing multiple unique players to share the same arena. Each player has a unique identity and can see and interact with other players in real-time.

## Architecture

The multiplayer system is organized into three modular components:

### 1. **MultiplayerManager** (`multiplayer.js`)
Core management system for multiplayer state and synchronization.

**Key Features:**
- Unique player ID generation
- Local player registration
- Remote player tracking
- Event-driven communication
- State broadcasting
- Heartbeat mechanism for connection health

**Usage:**
```javascript
const manager = new MultiplayerManager({
    playerName: 'PlayerName',
    wsUrl: 'ws://localhost:8080' // Optional, auto-detected if not provided
});

await manager.init();

// Subscribe to events
manager.on('remotePlayerAdded', (data) => {
    console.log('New player joined:', data.playerData.name);
});
```

### 2. **PlayerModule** (`playerModule.js`)
Represents individual players (both local and remote) with game logic.

**Key Features:**
- Player stats (HP, level, experience)
- Combat system (auto-attack, damage, level-up)
- Movement and velocity
- Collision detection and resolution
- Death animations
- State serialization/deserialization

**Usage:**
```javascript
const player = new PlayerModule(scene, playerId, {
    name: 'PlayerName',
    isLocal: true,
    color: 0x4CAF50,
    x: 100,
    y: 100,
    hp: 100,
    maxHP: 100
});

player.create(); // Create visual representation
player.update(); // Update each frame
player.takeDamage(10); // Apply damage
player.addExp(50); // Add experience
```

### 3. **PlayerRegistry** (`playerModule.js`)
Container for managing collections of players.

**Usage:**
```javascript
const registry = new PlayerRegistry();
registry.register(player);
registry.updateAll(deltaTime);
const allPlayers = registry.getAll();
```

## How It Works

### Initialization Flow

1. **Game Start**: User selects "MULTIPLAYER" from menu
2. **MultiplayerManager Init**: 
   - Generates unique player ID
   - Registers local player
   - Sets up event listeners
   - Starts heartbeat
3. **Scene Ready**: Scene can add remote players as they join
4. **Game Loop**: Each frame updates all players and broadcasts state

### Player Identity

Each player gets a unique ID composed of:
- Timestamp
- Random string
- Example: `player_1699500000000_abc1d2e3f`

Players are identified by this ID throughout their session.

### State Synchronization

**Local Player State Updates:**
- Position (from movement input)
- HP (from damage/healing)
- Experience & Level
- Damage output
- Death state

**Remote Player State Updates:**
- Received from MultiplayerManager events
- Applied via `PlayerModule.setState()`

### Event System

The MultiplayerManager uses an event-driven architecture:

```javascript
manager.on('playerJoined', (data) => {});
manager.on('localPlayerUpdated', (player) => {});
manager.on('remotePlayerAdded', (data) => {});
manager.on('remotePlayerUpdated', (data) => {});
manager.on('playerRemoved', (data) => {});
manager.on('stateUpdate', (data) => {});
manager.on('heartbeat', (data) => {});
```

## Integration with Main Scene

### In `MainScene` class:

```javascript
// Initialize in create()
await this.initMultiplayer();

// Update HUD with multiplayer info
const playerId = this.multiplayerManager.playerId;
const playerCount = this.remotePlayersMap.size + 1;

// Handle new remote players
this.multiplayerManager.on('remotePlayerAdded', (data) => {
    const remotePlayer = new PlayerModule(this, data.playerId, {
        ...data.playerData,
        isLocal: false
    });
    remotePlayer.create();
    this.remotePlayersMap.set(data.playerId, remotePlayer);
});
```

## Features

### ✅ Unique Player Identities
Each player has a guaranteed unique ID + name combination.

### ✅ Shared Arena
All players share the same game world and can see each other.

### ✅ Player States
- Name and unique color
- Health/Mana
- Level and Experience
- Combat stats
- Death state

### ✅ Event-Driven Communication
Clean event system for handling all multiplayer interactions.

### ✅ Local Storage Support
`PlayerDataStore` for saving/loading player progress.

### ✅ Auto-Connection Handling
Automatic WebSocket management with reconnection support.

## Backend Integration

To connect to a backend server:

```javascript
const manager = new MultiplayerManager({
    playerName: 'Player1',
    wsUrl: 'wss://your-server.com/ws' // Custom backend URL
});
```

The manager expects events to be handled by:
1. A WebSocket server receiving `stateUpdate` events
2. Broadcasting updates to all connected clients
3. Handling player join/leave events

### Example Backend Structure

```python
# Pseudocode for backend
@on_player_join
def handle_player_join(player_id):
    broadcast('playerJoined', player_data)
    
@on_state_update
def handle_state_update(player_id, state):
    broadcast('remotePlayerUpdated', {
        playerId: player_id,
        player: state
    })
```

## Usage Examples

### Example 1: Share URL for Multiplayer
```
Browser 1: http://localhost:3000/?playerName=Alice
Browser 2: http://localhost:3000/?playerName=Bob
Browser 3: http://localhost:3000/?playerName=Charlie
```

All players share the same URL and see each other in the arena.

### Example 2: Get All Players
```javascript
const allPlayers = this.multiplayerManager.getAllPlayers();
const remotePlayers = this.multiplayerManager.getRemotePlayers();
const localPlayer = this.multiplayerManager.getLocalPlayer();
```

### Example 3: Update Local Player State
```javascript
this.multiplayerManager.updateLocalPlayer({
    x: player.x,
    y: player.y,
    hp: player.stats.hp,
    level: player.level,
    exp: player.exp
});
```

### Example 4: Handle Player Disconnection
```javascript
manager.on('playerRemoved', (data) => {
    console.log(`Player ${data.player.name} left the arena`);
    updatePlayerCountUI();
});
```

## Data Flow Diagram

```
┌──────────────────────────────────────────┐
│         Multiplayer Manager              │
│  (Central State & Event Coordination)    │
└──────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
   │ Local   │ │Remote  │ │Remote  │
   │ Player  │ │Player1 │ │Player2 │
   │ Module  │ │Module  │ │Module  │
   └────┬────┘ └───┬────┘ └───┬────┘
        │           │          │
        └───────────┼──────────┘
                    │
        Events broadcast to UI/HUD
```

## Best Practices

1. **Always initialize multiplayer** in `create()` method
2. **Use event listeners** for responsive UI updates
3. **Keep PlayerModule instances** in a registry for easy access
4. **Broadcast state regularly** to keep remote players in sync
5. **Validate state** before applying remote player updates
6. **Handle disconnections gracefully** with fallback UI

## Performance Considerations

- Each player update broadcasts state to all listeners
- Heartbeat interval is 5 seconds (adjustable)
- Remote player updates are applied only when new data arrives
- Use `PlayerRegistry.updateAll()` for batch operations
- Consider throttling state broadcasts in high-player scenarios

## Troubleshooting

### Players not appearing?
- Check `initMultiplayer()` is called in `create()`
- Verify event listeners are registered
- Check browser console for errors

### State not syncing?
- Ensure `broadcastState()` is called each frame
- Check WebSocket connection is active
- Verify backend is forwarding events

### Performance issues?
- Reduce state broadcast frequency
- Increase heartbeat interval
- Implement state delta updates (only changed fields)

## Future Enhancements

- [ ] Automatic state delta compression
- [ ] Player persistence across sessions
- [ ] Chat system integration
- [ ] Raid/team system
- [ ] Leaderboards
- [ ] Custom player skins
- [ ] Voice chat support

## API Reference

See inline documentation in:
- `multiplayer.js` - MultiplayerManager API
- `playerModule.js` - PlayerModule & PlayerRegistry API







