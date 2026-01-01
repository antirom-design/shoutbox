import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import cors from 'cors';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Redis setup
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Rate limiting store (in-memory for simplicity, could be Redis)
const rateLimits = new Map();

// Helper: Check rate limit
function checkRateLimit(userId, action, limit, windowMs) {
  const key = `${userId}:${action}`;
  const now = Date.now();

  if (!rateLimits.has(key)) {
    rateLimits.set(key, []);
  }

  const timestamps = rateLimits.get(key).filter(ts => now - ts < windowMs);

  if (timestamps.length >= limit) {
    return false;
  }

  timestamps.push(now);
  rateLimits.set(key, timestamps);
  return true;
}

// Helper: Validate display name
function validateDisplayName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 2 || name.length > 20) return false;
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

// Helper: Generate room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Helper: Get room from Redis
async function getRoom(roomCode) {
  const data = await redis.get(`room:${roomCode}`);
  return data ? JSON.parse(data) : null;
}

// Helper: Save room to Redis
async function saveRoom(roomCode, roomData) {
  await redis.setex(
    `room:${roomCode}`,
    86400, // 24 hours TTL
    JSON.stringify(roomData)
  );
}

// Helper: Update room activity
async function updateRoomActivity(roomCode) {
  const room = await getRoom(roomCode);
  if (room) {
    room.lastActivity = Date.now();
    await saveRoom(roomCode, room);
  }
}

// Helper: Add message to room
async function addMessage(roomCode, message) {
  const room = await getRoom(roomCode);
  if (room) {
    room.messages.push(message);
    // Keep only last 250 messages
    if (room.messages.length > 250) {
      room.messages = room.messages.slice(-250);
    }
    room.lastActivity = Date.now();
    await saveRoom(roomCode, room);
    return true;
  }
  return false;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let currentUser = null;
  let currentRoom = null;

  // Set display name
  socket.on('set_name', async ({ displayName, localUUID }) => {
    try {
      if (!validateDisplayName(displayName)) {
        socket.emit('error', {
          code: 'invalid_name',
          message: 'Name must be 2-20 characters, alphanumeric, dash, or underscore only'
        });
        return;
      }

      const sessionToken = nanoid();
      currentUser = {
        userId: localUUID || nanoid(),
        displayName,
        sessionToken
      };

      socket.emit('session_created', {
        sessionToken,
        userId: currentUser.userId
      });

    } catch (error) {
      console.error('Error in set_name:', error);
      socket.emit('error', { code: 'server_error', message: 'Failed to set name' });
    }
  });

  // Create room
  socket.on('create_room', async () => {
    try {
      if (!currentUser) {
        socket.emit('error', { code: 'not_authenticated', message: 'Set name first' });
        return;
      }

      let roomCode;
      let attempts = 0;

      // Generate unique room code
      do {
        roomCode = generateRoomCode();
        attempts++;
      } while (await getRoom(roomCode) && attempts < 10);

      if (attempts >= 10) {
        socket.emit('error', { code: 'server_error', message: 'Failed to generate room code' });
        return;
      }

      const room = {
        roomCode,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        ownerId: currentUser.userId,
        participants: [{
          userId: currentUser.userId,
          displayName: currentUser.displayName,
          joinedAt: Date.now(),
          isOnline: true
        }],
        messages: [{
          id: nanoid(),
          type: 'system',
          timestamp: Date.now(),
          sender: null,
          payload: {
            event: 'room_created',
            metadata: { roomCode }
          }
        }],
        gameState: {
          activeGame: null,
          gameData: null
        }
      };

      await saveRoom(roomCode, room);

      socket.join(roomCode);
      currentRoom = roomCode;

      socket.emit('room_joined', {
        roomCode,
        roomState: room
      });

    } catch (error) {
      console.error('Error in create_room:', error);
      socket.emit('error', { code: 'server_error', message: 'Failed to create room' });
    }
  });

  // Join room
  socket.on('join_room', async ({ roomCode }) => {
    try {
      if (!currentUser) {
        socket.emit('error', { code: 'not_authenticated', message: 'Set name first' });
        return;
      }

      if (!roomCode || roomCode.length !== 6) {
        socket.emit('error', { code: 'invalid_room_code', message: 'Room code must be 6 characters' });
        return;
      }

      const room = await getRoom(roomCode.toUpperCase());

      if (!room) {
        socket.emit('error', { code: 'room_not_found', message: 'Room does not exist' });
        return;
      }

      if (room.participants.length >= 8) {
        socket.emit('error', { code: 'room_full', message: 'Room is full (max 8 players)' });
        return;
      }

      // Check if user already in room
      const existingParticipant = room.participants.find(p => p.userId === currentUser.userId);

      if (!existingParticipant) {
        // Check for duplicate names
        const nameExists = room.participants.some(
          p => p.displayName.toLowerCase() === currentUser.displayName.toLowerCase()
        );

        if (nameExists) {
          socket.emit('error', {
            code: 'name_taken',
            message: 'This name is already taken in this room'
          });
          return;
        }

        // Add new participant
        room.participants.push({
          userId: currentUser.userId,
          displayName: currentUser.displayName,
          joinedAt: Date.now(),
          isOnline: true
        });

        // Add system message
        const joinMessage = {
          id: nanoid(),
          type: 'system',
          timestamp: Date.now(),
          sender: null,
          payload: {
            event: 'user_joined',
            metadata: { userName: currentUser.displayName }
          }
        };

        room.messages.push(joinMessage);
        if (room.messages.length > 250) {
          room.messages = room.messages.slice(-250);
        }

        await saveRoom(roomCode.toUpperCase(), room);

        // Notify others
        socket.to(roomCode.toUpperCase()).emit('new_message', { message: joinMessage });
        socket.to(roomCode.toUpperCase()).emit('participant_update', {
          participants: room.participants
        });
      } else {
        // Rejoin - update online status
        existingParticipant.isOnline = true;
        await saveRoom(roomCode.toUpperCase(), room);
      }

      socket.join(roomCode.toUpperCase());
      currentRoom = roomCode.toUpperCase();

      socket.emit('room_joined', {
        roomCode: roomCode.toUpperCase(),
        roomState: room
      });

    } catch (error) {
      console.error('Error in join_room:', error);
      socket.emit('error', { code: 'server_error', message: 'Failed to join room' });
    }
  });

  // Send message
  socket.on('send_message', async ({ text }) => {
    try {
      if (!currentUser || !currentRoom) {
        socket.emit('error', { code: 'not_in_room', message: 'Join a room first' });
        return;
      }

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        socket.emit('error', { code: 'invalid_message', message: 'Message cannot be empty' });
        return;
      }

      if (text.length > 500) {
        socket.emit('error', { code: 'message_too_long', message: 'Message too long (max 500 chars)' });
        return;
      }

      // Rate limiting: 20 messages per minute
      if (!checkRateLimit(currentUser.userId, 'message', 20, 60000)) {
        socket.emit('error', { code: 'rate_limit', message: 'Too many messages. Slow down!' });
        return;
      }

      const message = {
        id: nanoid(),
        type: 'chat',
        timestamp: Date.now(),
        sender: currentUser.userId,
        payload: {
          text: text.trim(),
          displayName: currentUser.displayName
        }
      };

      const success = await addMessage(currentRoom, message);

      if (success) {
        io.to(currentRoom).emit('new_message', { message });
      }

    } catch (error) {
      console.error('Error in send_message:', error);
      socket.emit('error', { code: 'server_error', message: 'Failed to send message' });
    }
  });

  // Leave room
  socket.on('leave_room', async () => {
    try {
      if (currentRoom && currentUser) {
        const room = await getRoom(currentRoom);

        if (room) {
          const participant = room.participants.find(p => p.userId === currentUser.userId);
          if (participant) {
            participant.isOnline = false;
          }

          const leaveMessage = {
            id: nanoid(),
            type: 'system',
            timestamp: Date.now(),
            sender: null,
            payload: {
              event: 'user_left',
              metadata: { userName: currentUser.displayName }
            }
          };

          room.messages.push(leaveMessage);
          if (room.messages.length > 250) {
            room.messages = room.messages.slice(-250);
          }

          await saveRoom(currentRoom, room);

          socket.to(currentRoom).emit('new_message', { message: leaveMessage });
          socket.to(currentRoom).emit('participant_update', {
            participants: room.participants
          });
        }

        socket.leave(currentRoom);
        currentRoom = null;
      }
    } catch (error) {
      console.error('Error in leave_room:', error);
    }
  });

  // Start game (Poll)
  socket.on('start_game', async ({ gameType, gameData }) => {
    try {
      if (!currentUser || !currentRoom) {
        socket.emit('error', { code: 'not_in_room', message: 'Join a room first' });
        return;
      }

      const room = await getRoom(currentRoom);

      if (!room) {
        socket.emit('error', { code: 'room_not_found', message: 'Room not found' });
        return;
      }

      if (room.ownerId !== currentUser.userId) {
        socket.emit('error', { code: 'not_owner', message: 'Only room owner can start games' });
        return;
      }

      if (room.gameState.activeGame) {
        socket.emit('error', { code: 'game_active', message: 'A game is already running' });
        return;
      }

      if (gameType === 'poll') {
        if (!gameData.question || !gameData.options || gameData.options.length < 2) {
          socket.emit('error', { code: 'invalid_game_data', message: 'Poll needs question and at least 2 options' });
          return;
        }

        room.gameState = {
          activeGame: 'poll',
          gameData: {
            question: gameData.question,
            options: gameData.options.map(opt => ({ text: opt, votes: [] })),
            startedAt: Date.now(),
            endAt: Date.now() + 30000 // 30 seconds
          }
        };

        const gameMessage = {
          id: nanoid(),
          type: 'game-event',
          timestamp: Date.now(),
          sender: null,
          payload: {
            gameType: 'poll',
            action: 'question',
            data: {
              question: gameData.question,
              options: gameData.options
            }
          }
        };

        room.messages.push(gameMessage);
        if (room.messages.length > 250) {
          room.messages = room.messages.slice(-250);
        }

        await saveRoom(currentRoom, room);

        io.to(currentRoom).emit('new_message', { message: gameMessage });
        io.to(currentRoom).emit('game_update', { gameState: room.gameState });

        // Auto-end poll after 30 seconds
        setTimeout(async () => {
          const updatedRoom = await getRoom(currentRoom);
          if (updatedRoom && updatedRoom.gameState.activeGame === 'poll') {
            const resultMessage = {
              id: nanoid(),
              type: 'game-event',
              timestamp: Date.now(),
              sender: null,
              payload: {
                gameType: 'poll',
                action: 'result',
                data: {
                  question: updatedRoom.gameState.gameData.question,
                  results: updatedRoom.gameState.gameData.options
                }
              }
            };

            updatedRoom.messages.push(resultMessage);
            updatedRoom.gameState.activeGame = null;
            updatedRoom.gameState.gameData = null;

            await saveRoom(currentRoom, updatedRoom);

            io.to(currentRoom).emit('new_message', { message: resultMessage });
            io.to(currentRoom).emit('game_update', { gameState: updatedRoom.gameState });
          }
        }, 30000);
      }

    } catch (error) {
      console.error('Error in start_game:', error);
      socket.emit('error', { code: 'server_error', message: 'Failed to start game' });
    }
  });

  // Game action (e.g., vote in poll)
  socket.on('game_action', async ({ action, data }) => {
    try {
      if (!currentUser || !currentRoom) {
        socket.emit('error', { code: 'not_in_room', message: 'Join a room first' });
        return;
      }

      const room = await getRoom(currentRoom);

      if (!room || !room.gameState.activeGame) {
        socket.emit('error', { code: 'no_active_game', message: 'No active game' });
        return;
      }

      if (room.gameState.activeGame === 'poll' && action === 'vote') {
        const { optionIndex } = data;

        if (optionIndex < 0 || optionIndex >= room.gameState.gameData.options.length) {
          socket.emit('error', { code: 'invalid_option', message: 'Invalid option' });
          return;
        }

        // Remove previous vote
        room.gameState.gameData.options.forEach(opt => {
          opt.votes = opt.votes.filter(v => v !== currentUser.userId);
        });

        // Add new vote
        room.gameState.gameData.options[optionIndex].votes.push(currentUser.userId);

        await saveRoom(currentRoom, room);

        io.to(currentRoom).emit('game_update', { gameState: room.gameState });
      }

    } catch (error) {
      console.error('Error in game_action:', error);
      socket.emit('error', { code: 'server_error', message: 'Failed to process action' });
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);

    if (currentRoom && currentUser) {
      try {
        const room = await getRoom(currentRoom);
        if (room) {
          const participant = room.participants.find(p => p.userId === currentUser.userId);
          if (participant) {
            participant.isOnline = false;
          }
          await saveRoom(currentRoom, room);

          socket.to(currentRoom).emit('participant_update', {
            participants: room.participants
          });
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Shoutbox server running on port ${PORT}`);
});
