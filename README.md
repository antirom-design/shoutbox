# Shoutbox - Messenger-First Gaming Platform

A real-time messenger app where games are embedded directly into the chat flow. Built with React, Node.js, Socket.io, and Redis.

## Features

- **Zero-Friction Onboarding**: No account required, just enter a name and start playing
- **Real-time Communication**: Instant message delivery via WebSockets
- **Room-Based Multiplayer**: Private rooms with 6-character codes
- **Embedded Games**: Poll system directly in chat (more games coming soon)
- **Persistent Sessions**: Auto-reconnect after page refresh

## Tech Stack

**Frontend:**
- React with Vite
- Socket.io-client for real-time
- Local storage for session persistence

**Backend:**
- Node.js + Express
- Socket.io for WebSocket management
- Redis for in-memory storage (24h room TTL)

## Local Development

### Prerequisites
- Node.js 18+
- Redis (local or Docker)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Redis URL
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your backend URL
npm run dev
```

Visit `http://localhost:5173` to see the app.

## Deployment

### Deploy Backend to Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your repo
4. Render will auto-detect `render.yaml`
5. Add Redis add-on (free tier available)
6. Set environment variables:
   - `REDIS_URL`: Internal Redis URL from Render
   - `FRONTEND_URL`: Your Vercel frontend URL

### Deploy Frontend to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set root directory to `frontend`
4. Add environment variable:
   - `VITE_BACKEND_URL`: Your Render backend URL
5. Deploy!

## Architecture

### State Machine
```
ANONYMOUS → NAMED → IN_ROOM → (PLAYING)
```

### Message Types
- **Chat**: User-to-user messages (shown as speech bubbles)
- **System**: Join/leave notifications (centered, subtle)
- **Game-Event**: Interactive game widgets (polls, questions)

### Room Lifecycle
- Created when first user joins
- Auto-deletes after 24h inactivity
- Max 8 participants per room
- Owner can start games

## Game: Poll

The first mini-game demonstrates the game-event system:
1. Room owner clicks "Start Poll"
2. Enters question + 2-4 options
3. Poll appears as special message in chat
4. All participants vote in real-time
5. Results shown after 30 seconds

## API Events

### Client → Server
- `set_name`: Set display name
- `create_room`: Create new room
- `join_room`: Join existing room
- `send_message`: Send chat message
- `start_game`: Start a game (owner only)
- `game_action`: Perform game action (e.g., vote)

### Server → Client
- `session_created`: Session token received
- `room_joined`: Successfully joined room
- `new_message`: New message in room
- `participant_update`: Participant joined/left
- `game_update`: Game state changed
- `error`: Error occurred

## Roadmap

- [ ] More games (Quiz, Werewolf, Drawing)
- [ ] Voice chat integration
- [ ] Room customization (colors, avatars)
- [ ] Replay system for finished games
- [ ] Mobile app (React Native)

## License

MIT
