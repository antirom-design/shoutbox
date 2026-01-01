import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { nanoid } from 'nanoid';
import TestScreen from './components/TestScreen';
import NameInput from './components/NameInput';
import RoomJoin from './components/RoomJoin';
import ChatRoom from './components/ChatRoom';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// States: TESTING → ANONYMOUS → NAMED → IN_ROOM → (PLAYING)
const STATES = {
  TESTING: 'TESTING',
  ANONYMOUS: 'ANONYMOUS',
  NAMED: 'NAMED',
  IN_ROOM: 'IN_ROOM'
};

function App() {
  const [appState, setAppState] = useState(STATES.TESTING);
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [testReport, setTestReport] = useState(null);

  const socketRef = useRef(null);

  // Initialize socket and local storage
  useEffect(() => {
    // Only connect socket if tests passed
    if (appState === STATES.TESTING) {
      return;
    }

    // Don't reconnect if already connected
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    console.log('Initializing socket connection to:', BACKEND_URL);

    // Get or create local UUID
    let localUUID = localStorage.getItem('shoutbox_uuid');
    if (!localUUID) {
      localUUID = nanoid();
      localStorage.setItem('shoutbox_uuid', localUUID);
    }

    const lastDisplayName = localStorage.getItem('shoutbox_last_name');

    // Connect to socket
    socketRef.current = io(BACKEND_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to server, socket ID:', socketRef.current.id);
      setError(null);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    socketRef.current.on('error', (err) => {
      console.error('Socket error:', err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    });

    socketRef.current.on('session_created', ({ sessionToken, userId }) => {
      console.log('✅ Session created:', { sessionToken, userId });
      setUser(prev => ({ ...prev, sessionToken, userId }));
      setAppState(STATES.NAMED);
    });

    socketRef.current.on('room_joined', ({ roomCode, roomState }) => {
      setRoom(roomCode);
      setMessages(roomState.messages || []);
      setParticipants(roomState.participants || []);
      setGameState(roomState.gameState);
      setAppState(STATES.IN_ROOM);
    });

    socketRef.current.on('room_state', ({ participants, messages, gameState }) => {
      setMessages(messages || []);
      setParticipants(participants || []);
      setGameState(gameState);
    });

    socketRef.current.on('new_message', ({ message }) => {
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('participant_update', ({ participants }) => {
      setParticipants(participants);
    });

    socketRef.current.on('game_update', ({ gameState }) => {
      setGameState(gameState);
    });

    // Auto-restore session if available
    if (lastDisplayName) {
      setUser({ localUUID, displayName: lastDisplayName });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [appState]);

  const handleSetName = (displayName) => {
    const localUUID = localStorage.getItem('shoutbox_uuid');

    if (!socketRef.current || !socketRef.current.connected) {
      console.error('Socket not connected! Reconnecting...');
      setError('Connection lost. Please refresh the page.');
      return;
    }

    console.log('Sending set_name:', { displayName, localUUID });
    socketRef.current.emit('set_name', { displayName, localUUID });
    setUser({ localUUID, displayName });
    localStorage.setItem('shoutbox_last_name', displayName);
  };

  const handleCreateRoom = () => {
    socketRef.current.emit('create_room');
  };

  const handleJoinRoom = (roomCode) => {
    socketRef.current.emit('join_room', { roomCode });
  };

  const handleLeaveRoom = () => {
    socketRef.current.emit('leave_room');
    setRoom(null);
    setMessages([]);
    setParticipants([]);
    setGameState(null);
    setAppState(STATES.NAMED);
  };

  const handleSendMessage = (text) => {
    socketRef.current.emit('send_message', { text });
  };

  const handleStartPoll = (question, options) => {
    socketRef.current.emit('start_game', {
      gameType: 'poll',
      gameData: { question, options }
    });
  };

  const handleVote = (optionIndex) => {
    socketRef.current.emit('game_action', {
      action: 'vote',
      data: { optionIndex }
    });
  };

  const handleTestsPass = () => {
    setAppState(STATES.ANONYMOUS);
  };

  const handleTestsFail = (report) => {
    setTestReport(report);
  };

  return (
    <div className="app">
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {appState === STATES.TESTING && (
        <TestScreen
          backendUrl={BACKEND_URL}
          onTestsPass={handleTestsPass}
          onTestsFail={handleTestsFail}
        />
      )}

      {appState === STATES.ANONYMOUS && (
        <NameInput onSubmit={handleSetName} />
      )}

      {appState === STATES.NAMED && (
        <RoomJoin
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          displayName={user?.displayName}
        />
      )}

      {appState === STATES.IN_ROOM && (
        <ChatRoom
          roomCode={room}
          messages={messages}
          participants={participants}
          gameState={gameState}
          currentUser={user}
          onLeaveRoom={handleLeaveRoom}
          onSendMessage={handleSendMessage}
          onStartPoll={handleStartPoll}
          onVote={handleVote}
        />
      )}
    </div>
  );
}

export default App;
