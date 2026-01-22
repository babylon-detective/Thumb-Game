/**
 * Simple WebSocket Server for Thumb Game Multiplayer
 * 
 * This server enables cross-device multiplayer communication.
 * 
 * To run locally:
 *   npm install ws
 *   npm run server
 * 
 * To deploy:
 *   - Deploy to Railway, Render, Heroku, or similar
 *   - Update multiplayer.js to use your server URL
 */

import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 8080;

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected players
const players = new Map();

// Broadcast message to all clients except sender
function broadcast(message, excludePlayerId = null) {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            // Skip the sender if specified
            if (excludePlayerId && client.playerId === excludePlayerId) {
                return;
            }
            client.send(data);
        }
    });
}

// Handle new connections
wss.on('connection', (ws, req) => {
    console.log(`[Server] New connection from ${req.socket.remoteAddress}`);
    
    let playerId = null;
    let playerName = null;
    
    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            
            switch (data.type) {
                case 'playerJoined':
                    playerId = data.playerId;
                    playerName = data.playerName;
                    ws.playerId = playerId;
                    
                    // Store player info
                    players.set(playerId, {
                        id: playerId,
                        name: playerName,
                        color: data.color,
                        x: 0,
                        y: 0,
                        hp: 100,
                        maxHp: 100,
                        level: 1,
                        exp: 0,
                        isAlive: true,
                        connectedAt: Date.now()
                    });
                    
                    console.log(`[Server] Player joined: ${playerName} (${playerId.substring(0, 8)}...)`);
                    
                    // Send current players list to new player
                    ws.send(JSON.stringify({
                        type: 'playersList',
                        players: Array.from(players.values())
                    }));
                    
                    // Notify all other players about new player
                    broadcast({
                        type: 'remotePlayerAdded',
                        playerId: playerId,
                        playerData: players.get(playerId)
                    }, playerId);
                    
                    break;
                    
                case 'stateUpdate':
                    if (!playerId) break;
                    
                    // Update player state
                    const player = players.get(playerId);
                    if (player) {
                        Object.assign(player, {
                            ...data.state,
                            lastUpdate: Date.now()
                        });
                        
                        // Broadcast state to all other players
                        broadcast({
                            type: 'remotePlayerUpdated',
                            playerId: playerId,
                            player: player
                        }, playerId);
                    }
                    break;
                    
                case 'heartbeat':
                    if (!playerId) break;
                    
                    const p = players.get(playerId);
                    if (p) {
                        p.lastUpdate = Date.now();
                    }
                    break;
            }
        } catch (error) {
            console.error('[Server] Error parsing message:', error);
        }
    });
    
    // Handle disconnection
    ws.on('close', () => {
        if (playerId) {
            console.log(`[Server] Player disconnected: ${playerName} (${playerId.substring(0, 8)}...)`);
            
            // Remove player
            players.delete(playerId);
            
            // Notify all other players
            broadcast({
                type: 'playerRemoved',
                playerId: playerId
            });
        }
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error('[Server] WebSocket error:', error);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`[Server] WebSocket server running on port ${PORT}`);
    console.log(`[Server] Connect clients to: ws://localhost:${PORT}`);
});

// Cleanup inactive players (disconnected for > 30 seconds)
setInterval(() => {
    const now = Date.now();
    for (const [id, player] of players.entries()) {
        if (player.lastUpdate && (now - player.lastUpdate) > 30000) {
            console.log(`[Server] Removing inactive player: ${player.name} (${id.substring(0, 8)}...)`);
            players.delete(id);
            broadcast({
                type: 'playerRemoved',
                playerId: id
            });
        }
    }
}, 10000); // Check every 10 seconds

