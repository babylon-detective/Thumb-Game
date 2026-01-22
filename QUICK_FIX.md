# Quick Fix: Enable Cross-Device Multiplayer

## The Issue

You deployed to Vercel and tested on mobile + laptop, but players don't see each other.

**Why?** BroadcastChannel only works between tabs in the same browser. For cross-device (mobile ↔ laptop), you need a WebSocket server.

---

## Quick Solution (5 Minutes)

### Step 1: Deploy WebSocket Server

**Option A: Railway (Easiest)**

1. Go to [railway.app](https://railway.app)
2. Sign up/login
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo
5. Railway auto-detects Node.js
6. Set start command: `node server.js`
7. Deploy!
8. Copy the URL Railway gives you (e.g., `wss://your-app.railway.app`)

**Option B: Render (Also Easy)**

1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Build command: `npm install`
6. Start command: `node server.js`
7. Deploy!
8. Copy the URL (e.g., `wss://your-app.onrender.com`)

---

### Step 2: Update Your Game Code

In `script.js`, find the `initMultiplayer()` function and update it:

```javascript
async initMultiplayer() {
    try {
        this.multiplayerManager = new MultiplayerManager({
            playerName: this.getPlayerName(),
            wsUrl: 'wss://YOUR-SERVER-URL-HERE'  // ← Paste your Railway/Render URL here
        });
        
        await this.multiplayerManager.init();
        // ... rest of code
    }
}
```

**Replace `YOUR-SERVER-URL-HERE` with your actual server URL** (e.g., `wss://your-app.railway.app`)

---

### Step 3: Redeploy to Vercel

1. Commit your changes:
   ```bash
   git add script.js
   git commit -m "Add WebSocket server URL"
   git push
   ```

2. Vercel will auto-deploy

---

### Step 4: Test!

1. Open on mobile: `https://your-game.vercel.app/?playerName=Mobile`
2. Open on laptop: `https://your-game.vercel.app/?playerName=Laptop`
3. Check console (F12) on both:
   - Should see: `[Multiplayer] WebSocket connected`
   - Should see: `[Multiplayer] Player joined via WebSocket`
4. Both players should see each other in the arena! 🎉

---

## Alternative: Use URL Parameter (No Code Changes)

If you don't want to hardcode the URL, you can pass it via URL:

1. Update `script.js` to read from URL:
   ```javascript
   getPlayerName() {
       const params = new URLSearchParams(window.location.search);
       return params.get('playerName') || `Player_${Math.random().toString(36).substr(2, 9)}`;
   }
   
   // Add this:
   getWebSocketUrl() {
       const params = new URLSearchParams(window.location.search);
       return params.get('ws') || null;
   }
   ```

2. Then in `initMultiplayer()`:
   ```javascript
   this.multiplayerManager = new MultiplayerManager({
       playerName: this.getPlayerName(),
       wsUrl: this.getWebSocketUrl()
   });
   ```

3. Use URL like: `https://your-game.vercel.app/?playerName=Alice&ws=wss://your-server.com`

---

## Verify It's Working

### Check Console Logs

**On both devices, you should see:**
```
[Multiplayer] Connecting to WebSocket server: wss://your-server.com
[Multiplayer] WebSocket connected
[Multiplayer] Player joined: YourName (ID: player_...)
[Multiplayer] Player joined via WebSocket: OtherPlayerName
[Multiplayer] ===== PLAYERS IN SHARED SPACE (2) =====
```

**If you see:**
```
[Multiplayer] BroadcastChannel initialized
```
**Then WebSocket isn't connecting** - check your server URL.

---

## Troubleshooting

### "WebSocket connection failed"
- Check server is running (check Railway/Render dashboard)
- Check URL is correct (must start with `wss://` for HTTPS)
- Check server logs for errors

### "BroadcastChannel initialized" (but no cross-device)
- WebSocket isn't connecting
- Check `wsUrl` is set correctly
- Check server is accessible

### Players still don't see each other
- Check console on both devices
- Verify both see "WebSocket connected"
- Check server logs show both players connected
- Try `window.multiplayerDebug.logPlayers()` in console

---

## Summary

1. ✅ Deploy `server.js` to Railway/Render
2. ✅ Copy WebSocket URL
3. ✅ Update `script.js` with URL
4. ✅ Redeploy to Vercel
5. ✅ Test on mobile + laptop

**That's it!** Your cross-device multiplayer will work! 🚀







