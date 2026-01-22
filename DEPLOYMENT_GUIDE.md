# Deployment Guide - Cross-Device Multiplayer

## The Problem

**BroadcastChannel API only works between tabs in the same browser** - it won't work across:
- Different devices (mobile ↔ laptop)
- Different browsers
- Different browser instances

**For cross-device multiplayer, you NEED a WebSocket server.**

---

## Quick Solution: Deploy WebSocket Server

### Option 1: Railway (Recommended - Easiest)

1. **Install Railway CLI** (or use web interface):
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy server.js**:
   ```bash
   railway init
   railway up
   ```

3. **Get your WebSocket URL**:
   - Railway will give you a URL like: `wss://your-app.railway.app`
   - Copy this URL

4. **Update your game**:
   In `script.js`, update the multiplayer initialization:
   ```javascript
   this.multiplayerManager = new MultiplayerManager({
       playerName: this.getPlayerName(),
       wsUrl: 'wss://your-app.railway.app'  // Your Railway URL
   });
   ```

5. **Deploy game to Vercel** (as you already did)

6. **Test**: Open game on mobile and laptop - they should see each other!

---

### Option 2: Render (Free Tier Available)

1. **Create account** at [render.com](https://render.com)

2. **Create new Web Service**:
   - Connect your GitHub repo
   - Build command: `npm install`
   - Start command: `node server.js`
   - Environment: Node

3. **Get your WebSocket URL**:
   - Render gives you: `wss://your-app.onrender.com`
   - Copy this URL

4. **Update your game** (same as Railway)

---

### Option 3: Heroku

1. **Install Heroku CLI**:
   ```bash
   heroku login
   heroku create your-app-name
   ```

2. **Deploy**:
   ```bash
   git push heroku main
   ```

3. **Get URL**: `wss://your-app-name.herokuapp.com`

---

### Option 4: Local Testing (No Deployment)

For **local testing only** (same computer, different tabs):

1. **Install dependencies**:
   ```bash
   npm install ws
   ```

2. **Start server**:
   ```bash
   npm run server
   # Server runs on ws://localhost:8080
   ```

3. **Start game**:
   ```bash
   npm run dev
   ```

4. **Open multiple tabs**: `http://localhost:3000/?playerName=Alice`

**Note**: This only works on the same computer. For mobile ↔ laptop, you need to deploy the server.

---

## Configuration

### Update multiplayer.js to use your server URL

**Method 1: Hardcode in script.js** (Quick)
```javascript
this.multiplayerManager = new MultiplayerManager({
    playerName: this.getPlayerName(),
    wsUrl: 'wss://your-server-url.com'  // Your deployed server
});
```

**Method 2: Environment variable** (Better for production)
```javascript
const wsUrl = import.meta.env.VITE_WS_URL || null;

this.multiplayerManager = new MultiplayerManager({
    playerName: this.getPlayerName(),
    wsUrl: wsUrl
});
```

Then in `.env`:
```
VITE_WS_URL=wss://your-server-url.com
```

**Method 3: URL parameter** (Flexible)
```javascript
const params = new URLSearchParams(window.location.search);
const wsUrl = params.get('ws') || null;

this.multiplayerManager = new MultiplayerManager({
    playerName: this.getPlayerName(),
    wsUrl: wsUrl
});
```

Then use: `https://your-game.vercel.app/?ws=wss://your-server.com`

---

## Testing Checklist

### ✅ Local Testing (Same Computer)
- [ ] Run `npm run server` (starts WebSocket server)
- [ ] Run `npm run dev` (starts game)
- [ ] Open 2 tabs: `http://localhost:3000/?playerName=Alice` and `?playerName=Bob`
- [ ] Check console: Should see "WebSocket connected"
- [ ] Check console: Should see "Player joined via WebSocket"
- [ ] Both players should see each other in arena

### ✅ Cross-Device Testing
- [ ] Deploy server.js to Railway/Render/Heroku
- [ ] Get WebSocket URL (wss://...)
- [ ] Update game code with WebSocket URL
- [ ] Deploy game to Vercel
- [ ] Open on mobile: `https://your-game.vercel.app/?playerName=Mobile`
- [ ] Open on laptop: `https://your-game.vercel.app/?playerName=Laptop`
- [ ] Check console on both: Should see "WebSocket connected"
- [ ] Both should see each other in arena

---

## Troubleshooting

### Problem: "WebSocket connection failed"
**Solution**: 
- Check server is running
- Check WebSocket URL is correct (wss:// for HTTPS, ws:// for HTTP)
- Check server allows WebSocket connections
- Check firewall/network settings

### Problem: Players don't see each other
**Solution**:
- Check browser console for errors
- Verify WebSocket is connected: Look for "WebSocket connected" in console
- Check server logs: Should see "Player joined" messages
- Verify both players are using same server URL

### Problem: "BroadcastChannel initialized" but no cross-device
**Solution**:
- BroadcastChannel only works for same-browser tabs
- For cross-device, you MUST use WebSocket
- Make sure `wsUrl` is set correctly

### Problem: Server won't start
**Solution**:
- Make sure `ws` package is installed: `npm install ws`
- Check PORT environment variable (defaults to 8080)
- Check if port 8080 is already in use

---

## Server Requirements

The `server.js` file needs:
- Node.js 14+ 
- `ws` package (WebSocket library)
- Port 8080 (or set PORT environment variable)

**Deployment platforms that work**:
- ✅ Railway
- ✅ Render
- ✅ Heroku
- ✅ Fly.io
- ✅ DigitalOcean App Platform
- ❌ Vercel (doesn't support WebSocket servers)
- ❌ Netlify (doesn't support WebSocket servers)

**Note**: Vercel/Netlify are great for the frontend, but you need a separate service for the WebSocket server.

---

## Quick Start (5 Minutes)

1. **Deploy server to Railway**:
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   # Copy the URL it gives you
   ```

2. **Update game code**:
   ```javascript
   // In script.js, initMultiplayer():
   this.multiplayerManager = new MultiplayerManager({
       playerName: this.getPlayerName(),
       wsUrl: 'wss://YOUR-RAILWAY-URL'  // Paste URL here
   });
   ```

3. **Deploy game to Vercel** (as you already did)

4. **Test**:
   - Open on mobile: `https://your-game.vercel.app/?playerName=Mobile`
   - Open on laptop: `https://your-game.vercel.app/?playerName=Laptop`
   - Both should see each other! 🎉

---

## Cost

- **Railway**: Free tier (500 hours/month), then $5/month
- **Render**: Free tier available
- **Heroku**: Free tier discontinued, starts at $7/month
- **Fly.io**: Free tier available

**Recommendation**: Start with Railway or Render (both have free tiers).

---

## Next Steps

1. Deploy `server.js` to Railway/Render
2. Get WebSocket URL
3. Update game code with WebSocket URL
4. Redeploy game to Vercel
5. Test cross-device!

**Questions?** Check the console logs - they'll tell you exactly what's happening!







