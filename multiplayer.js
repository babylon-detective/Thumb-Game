/**
 * Multiplayer Module
 * Handles unique player identities, state synchronization, and network communication
 * Allows multiple unique players to share the same URL in a shared arena
 */

export class MultiplayerManager {
    constructor(options = {}) {
        this.playerId = this.generateUniqueId();
        this.playerName = options.playerName || `Player_${this.playerId.substring(0, 6)}`;
        this.players = new Map(); // Map of playerId -> PlayerState
        this.wsUrl = options.wsUrl || this.getWebSocketUrl(options);
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.listeners = new Map(); // Event listeners
        this.gameState = {
            arena: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            tick: 0
        };
        this.heartbeatInterval = null;
        this.lastHeartbeat = Date.now();
        
        // Cross-tab communication using BroadcastChannel API (for local testing without server)
        this.broadcastChannel = null;
        this.channelName = options.channelName || 'thumb-game-multiplayer';
        this.useLocalBroadcast = options.useLocalBroadcast !== false; // Default: true for local testing
        this.useWebSocket = options.useWebSocket !== false && this.wsUrl !== null; // Try WebSocket if URL provided
        
        // Setup communication method
        if (this.useWebSocket && this.wsUrl) {
            this.setupWebSocket();
        } else {
            this.setupBroadcastChannel();
        }
    }

    /**
     * Generate a unique ID for this player
     */
    generateUniqueId() {
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Determine WebSocket URL based on current environment
     */
    getWebSocketUrl(options = {}) {
        // Check if we have a custom server URL
        if (options.wsUrl) {
            return options.wsUrl;
        }
        
        // Auto-detect: if on localhost, use local server; otherwise use same host
        const hostname = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Local development
            return `${protocol}//${hostname}:8080`;
        } else {
            // Production: use same host but different port, or subdomain
            // For Vercel/Netlify, you'll need a separate WebSocket server
            // Option 1: Same host, different port (requires server on that port)
            // return `${protocol}//${hostname}:8080`;
            
            // Option 2: Use a WebSocket service URL (recommended for Vercel)
            // You'll need to deploy server.js to a service that supports WebSockets
            // Example: Railway, Render, Heroku, etc.
            // return 'wss://your-websocket-server.railway.app';
            
            // For now, return null to use BroadcastChannel fallback
            return null;
        }
    }

    /**
     * Set up WebSocket connection for cross-device multiplayer
     */
    setupWebSocket() {
        if (!this.wsUrl) {
            console.warn('[Multiplayer] No WebSocket URL provided, falling back to BroadcastChannel');
            this.setupBroadcastChannel();
            return;
        }
        
        try {
            console.log(`[Multiplayer] Connecting to WebSocket server: ${this.wsUrl}`);
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => {
                console.log('[Multiplayer] WebSocket connected');
                this.connected = true;
                this.reconnectAttempts = 0;
                
                // Send player join message
                this.ws.send(JSON.stringify({
                    type: 'playerJoined',
                    playerId: this.playerId,
                    playerName: this.playerName,
                    color: this.players.get(this.playerId)?.color || this.generatePlayerColor()
                }));
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('[Multiplayer] Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('[Multiplayer] WebSocket error:', error);
                this.connected = false;
            };
            
            this.ws.onclose = () => {
                console.log('[Multiplayer] WebSocket disconnected');
                this.connected = false;
                
                // Attempt to reconnect
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[Multiplayer] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    setTimeout(() => {
                        this.setupWebSocket();
                    }, this.reconnectDelay);
                } else {
                    console.warn('[Multiplayer] Max reconnection attempts reached, falling back to BroadcastChannel');
                    this.setupBroadcastChannel();
                }
            };
        } catch (error) {
            console.error('[Multiplayer] Failed to setup WebSocket:', error);
            // Fall back to BroadcastChannel
            this.setupBroadcastChannel();
        }
    }

    /**
     * Handle messages received from WebSocket server
     */
    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'playersList':
                // Server sent list of all current players
                console.log(`[Multiplayer] Received players list: ${message.players.length} players`);
                message.players.forEach((playerData) => {
                    if (playerData.id !== this.playerId) {
                        this.addRemotePlayer(playerData.id, playerData);
                    }
                });
                break;
                
            case 'remotePlayerAdded':
                console.log(`[Multiplayer] Player joined via WebSocket: ${message.playerData.name}`);
                this.addRemotePlayer(message.playerId, message.playerData);
                break;
                
            case 'remotePlayerUpdated':
                this.updateRemotePlayer(message.playerId, message.player);
                break;
                
            case 'playerRemoved':
                console.log(`[Multiplayer] Player left via WebSocket: ${message.playerId.substring(0, 8)}...`);
                this.removePlayer(message.playerId);
                break;
        }
    }

    /**
     * Set up BroadcastChannel for cross-tab communication (local testing without server)
     */
    setupBroadcastChannel() {
        if (!this.useLocalBroadcast) return;
        
        try {
            // Check if BroadcastChannel is supported
            if (typeof BroadcastChannel !== 'undefined') {
                this.broadcastChannel = new BroadcastChannel(this.channelName);
                
                // Listen for messages from other tabs
                this.broadcastChannel.onmessage = (event) => {
                    const { type, data, fromPlayerId } = event.data;
                    
                    // Ignore messages from ourselves
                    if (fromPlayerId === this.playerId) return;
                    
                    this.handleBroadcastMessage(type, data, fromPlayerId);
                };
                
                console.log(`[Multiplayer] BroadcastChannel initialized for cross-tab communication`);
            } else {
                console.warn('[Multiplayer] BroadcastChannel not supported, using local events only');
            }
        } catch (error) {
            console.error('[Multiplayer] Failed to setup BroadcastChannel:', error);
        }
    }

    /**
     * Handle messages received from other tabs via BroadcastChannel
     */
    handleBroadcastMessage(type, data, fromPlayerId) {
        switch (type) {
            case 'playerJoined':
                console.log(`[Multiplayer] Player joined from another tab: ${data.playerName} (${fromPlayerId.substring(0, 8)}...)`);
                this.addRemotePlayer(fromPlayerId, {
                    id: fromPlayerId,
                    name: data.playerName,
                    color: data.color,
                    x: 0,
                    y: 0,
                    hp: 100,
                    maxHp: 100,
                    level: 1,
                    exp: 0,
                    isAlive: true
                });
                break;
                
            case 'stateUpdate':
                this.updateRemotePlayer(fromPlayerId, data.state);
                break;
                
            case 'playerLeft':
                console.log(`[Multiplayer] Player left: ${fromPlayerId.substring(0, 8)}...`);
                this.removePlayer(fromPlayerId);
                break;
                
            case 'heartbeat':
                // Update last seen time for this player
                const player = this.players.get(fromPlayerId);
                if (player) {
                    player.lastUpdate = Date.now();
                }
                break;
        }
    }

    /**
     * Send message to other tabs via BroadcastChannel
     */
    sendBroadcastMessage(type, data) {
        if (!this.broadcastChannel) return;
        
        try {
            this.broadcastChannel.postMessage({
                type,
                data,
                fromPlayerId: this.playerId,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('[Multiplayer] Failed to send broadcast message:', error);
        }
    }

    /**
     * Initialize multiplayer connection
     */
    async init() {
        this.registerLocalPlayer();
        this.broadcastPlayerJoined();
        this.setupHeartbeat();
        
        // Log all players in shared space
        this.logPlayersInSharedSpace();
        
        return this.playerId;
    }

    /**
     * Register this player locally
     */
    registerLocalPlayer() {
        this.players.set(this.playerId, {
            id: this.playerId,
            name: this.playerName,
            isLocal: true,
            x: 0,
            y: 0,
            hp: 100,
            maxHp: 100,
            level: 1,
            exp: 0,
            color: this.generatePlayerColor(),
            lastUpdate: Date.now(),
            isAlive: true
        });
    }

    /**
     * Generate a unique color for this player
     */
    generatePlayerColor() {
        const colors = [
            0x4CAF50, // Green
            0x2196F3, // Blue
            0xF44336, // Red
            0xFF9800, // Orange
            0x9C27B0, // Purple
            0x00BCD4, // Cyan
            0xFFEB3B, // Yellow
            0xE91E63  // Pink
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Set up heartbeat to keep connection alive and sync state
     */
    setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const heartbeatData = {
                playerId: this.playerId,
                timestamp: Date.now()
            };
            
            // Emit local event
            this.emit('heartbeat', heartbeatData);
            
            // Send via WebSocket if connected
            if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'heartbeat',
                    playerId: this.playerId
                }));
            } else {
                // Fall back to BroadcastChannel
                this.sendBroadcastMessage('heartbeat', {});
            }
            
            this.lastHeartbeat = Date.now();
        }, 5000);
    }

    /**
     * Clear heartbeat
     */
    clearHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Broadcast that a player has joined
     */
    broadcastPlayerJoined() {
        const localPlayer = this.players.get(this.playerId);
        const joinData = {
            playerId: this.playerId,
            playerName: this.playerName,
            color: localPlayer.color
        };
        
        // Emit local event
        this.emit('playerJoined', joinData);
        
        // Send via WebSocket if connected
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'playerJoined',
                playerId: this.playerId,
                playerName: this.playerName,
                color: localPlayer.color
            }));
        } else {
            // Fall back to BroadcastChannel
            this.sendBroadcastMessage('playerJoined', {
                playerName: this.playerName,
                color: localPlayer.color
            });
        }
        
        console.log(`[Multiplayer] Player joined: ${this.playerName} (ID: ${this.playerId.substring(0, 8)}...)`);
    }

    /**
     * Update local player state
     */
    updateLocalPlayer(state) {
        const player = this.players.get(this.playerId);
        if (player) {
            Object.assign(player, {
                ...state,
                lastUpdate: Date.now()
            });
            this.emit('localPlayerUpdated', player);
        }
    }

    /**
     * Add or update a remote player
     */
    addRemotePlayer(playerId, playerData) {
        if (playerId === this.playerId) return; // Don't add ourselves
        
        const isNew = !this.players.has(playerId);
        this.players.set(playerId, {
            ...playerData,
            isLocal: false,
            lastUpdate: Date.now()
        });
        
        if (isNew) {
            this.emit('remotePlayerAdded', { playerId, playerData });
            this.logPlayersInSharedSpace();
        }
    }

    /**
     * Update a remote player's state
     */
    updateRemotePlayer(playerId, state) {
        if (playerId === this.playerId) return;
        
        const player = this.players.get(playerId);
        if (player) {
            Object.assign(player, {
                ...state,
                lastUpdate: Date.now()
            });
            this.emit('remotePlayerUpdated', { playerId, player });
        }
    }

    /**
     * Remove a player from the arena
     */
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            this.players.delete(playerId);
            this.emit('playerRemoved', { playerId, player });
            this.logPlayersInSharedSpace();
        }
    }

    /**
     * Get all players
     */
    getAllPlayers() {
        return Array.from(this.players.values());
    }

    /**
     * Get all remote players
     */
    getRemotePlayers() {
        return this.getAllPlayers().filter(p => !p.isLocal);
    }

    /**
     * Get local player
     */
    getLocalPlayer() {
        return this.players.get(this.playerId);
    }

    /**
     * Get a specific player by ID
     */
    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    /**
     * Broadcast state to all other players
     */
    broadcastState(state) {
        const stateData = {
            playerId: this.playerId,
            state: state,
            timestamp: Date.now()
        };
        
        // Emit local event
        this.emit('stateUpdate', stateData);
        
        // Send via WebSocket if connected
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'stateUpdate',
                playerId: this.playerId,
                state: state
            }));
        } else {
            // Fall back to BroadcastChannel
            this.sendBroadcastMessage('stateUpdate', {
                state: state
            });
        }
    }

    /**
     * Register an event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove an event listener
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit an event to all listeners
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Log all players currently in the shared space
     */
    logPlayersInSharedSpace() {
        const allPlayers = this.getAllPlayers();
        console.log(`\n[Multiplayer] ===== PLAYERS IN SHARED SPACE (${allPlayers.length}) =====`);
        allPlayers.forEach((player, index) => {
            const marker = player.isLocal ? '👤 (YOU)' : '👥';
            console.log(`${marker} ${index + 1}. ${player.name}`);
            console.log(`   ID: ${player.id.substring(0, 16)}...`);
            console.log(`   Color: #${player.color.toString(16).padStart(6, '0')}`);
            console.log(`   Position: (${Math.round(player.x)}, ${Math.round(player.y)})`);
            console.log(`   HP: ${player.hp}/${player.maxHp} | Level: ${player.level}`);
        });
        console.log(`[Multiplayer] ============================================\n`);
    }

    /**
     * Clean up resources
     */
    disconnect() {
        this.clearHeartbeat();
        
        // Notify server/tabs that this player is leaving
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Server will handle cleanup
        } else if (this.broadcastChannel) {
            this.sendBroadcastMessage('playerLeft', {});
        }
        
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.emit('disconnected', { playerId: this.playerId });
    }

    /**
     * Get arena state for serialization
     */
    getArenaState() {
        return {
            playerId: this.playerId,
            players: this.getAllPlayers().map(p => ({
                id: p.id,
                name: p.name,
                x: p.x,
                y: p.y,
                hp: p.hp,
                maxHp: p.maxHp,
                level: p.level,
                exp: p.exp,
                color: p.color,
                isAlive: p.isAlive
            })),
            tick: this.gameState.tick
        };
    }
}

/**
 * Local Storage helper for persisting player data
 */
export class PlayerDataStore {
    constructor(storageKey = 'thumbGame_players') {
        this.storageKey = storageKey;
    }

    /**
     * Save player data
     */
    savePlayer(playerId, playerData) {
        try {
            const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            data[playerId] = {
                ...playerData,
                lastSaved: Date.now()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving player data:', error);
        }
    }

    /**
     * Load player data
     */
    loadPlayer(playerId) {
        try {
            const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            return data[playerId] || null;
        } catch (error) {
            console.error('Error loading player data:', error);
            return null;
        }
    }

    /**
     * Get all saved players
     */
    getAllPlayers() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (error) {
            console.error('Error loading all players:', error);
            return {};
        }
    }

    /**
     * Clear all player data
     */
    clearAll() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Error clearing player data:', error);
        }
    }
}

