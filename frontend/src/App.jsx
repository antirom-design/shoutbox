import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import TestScreen from './components/TestScreen';
import NameInput from './components/NameInput';
import RoomJoin from './components/RoomJoin';
import ChatRoom from './components/ChatRoom';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

// Debug: Log what we're using
console.log('🔧 DEBUG - BACKEND_URL from env:', import.meta.env.VITE_BACKEND_URL);
console.log('🔧 DEBUG - Final BACKEND_URL:', BACKEND_URL);
console.log('🔧 DEBUG - Final WS_URL:', WS_URL);

// States: TESTING → ANONYMOUS → NAMED → IN_ROOM
const STATES = {
  TESTING: 'TESTING',
  ANONYMOUS: 'ANONYMOUS',
  NAMED: 'NAMED',
  IN_ROOM: 'IN_ROOM'
};

function App() {
  const [appState, setAppState] = useState(STATES.TESTING);
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [pollState, setPollState] = useState(null);
  const [error, setError] = useState(null);
  const [isHousemaster, setIsHousemaster] = useState(false);
  const [autoJoinRoom, setAutoJoinRoom] = useState(null);

  const wsRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Initialize session ID - use sessionStorage for per-tab uniqueness
  useEffect(() => {
    let sessionId = sessionStorage.getItem('shoutbox_session_id');
    if (!sessionId) {
      sessionId = nanoid();
      sessionStorage.setItem('shoutbox_session_id', sessionId);
    }
    sessionIdRef.current = sessionId;
    console.log('🆔 Session ID:', sessionId);
  }, []);

  // Check for room code in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      console.log('🔗 Auto-join room from URL:', roomParam);
      setAutoJoinRoom(roomParam.toUpperCase());
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (appState === STATES.TESTING || appState === STATES.ANONYMOUS || appState === STATES.NAMED) {
      return;
    }

    console.log('🔌 Connecting to Funkhaus WebSocket:', WS_URL);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setError(null);

      // Join house
      if (roomCode && user) {
        const joinMessage = {
          type: 'join',
          data: {
            houseCode: roomCode,
            roomName: user.displayName,
            sessionId: sessionIdRef.current
          }
        };
        console.log('📤 Sending join:', joinMessage);
        ws.send(JSON.stringify(joinMessage));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📥 Received:', message);
        handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setError('Connection error. Please refresh.');
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [appState, roomCode, user]);

  const handleMessage = (message) => {
    const { type, data } = message;

    switch (type) {
      case 'joined':
        setIsHousemaster(data.isHousemaster);
        setParticipants(data.rooms || []);
        break;

      case 'rooms':
        setParticipants(data || []);
        break;

      case 'chat':
        const chatMsg = {
          id: nanoid(),
          type: 'chat',
          timestamp: data.timestamp,
          sender: data.senderId,
          payload: {
            text: data.text,
            displayName: data.sender
          }
        };
        setMessages(prev => [...prev, chatMsg]);
        break;

      case 'pollStarted':
        setPollState({
          active: true,
          question: data.question,
          options: data.options.map(opt => ({ text: opt, votes: [] })),
          endAt: data.endAt,
          showRealtime: data.showRealtime || false,
          duration: data.duration || 30,
          multipleChoice: data.multipleChoice || false,
          userVote: data.multipleChoice ? [] : null  // Array for multiple choice, single index for single choice
        });

        const pollStartMsg = {
          id: nanoid(),
          type: 'game-event',
          timestamp: Date.now(),
          sender: null,
          payload: {
            gameType: 'poll',
            action: 'question',
            data: {
              question: data.question,
              options: data.options
            }
          }
        };
        setMessages(prev => [...prev, pollStartMsg]);
        break;

      case 'pollUpdate':
        setPollState(prev => {
          // Find which option(s) the current user voted for
          let userVote;
          if (prev.multipleChoice) {
            // For multiple choice, collect all indices where user has voted
            userVote = [];
            data.options.forEach((opt, idx) => {
              if (opt.votes && opt.votes.includes(sessionIdRef.current)) {
                userVote.push(idx);
              }
            });
          } else {
            // For single choice, find the one voted option
            userVote = null;
            data.options.forEach((opt, idx) => {
              if (opt.votes && opt.votes.includes(sessionIdRef.current)) {
                userVote = idx;
              }
            });
          }

          return {
            ...prev,
            options: data.options,
            userVote
          };
        });
        break;

      case 'pollEnded':
        setPollState({ active: false });

        // Remove the active poll question message and replace with results
        setMessages(prev => {
          // Filter out the poll question
          const withoutQuestion = prev.filter(msg =>
            !(msg.type === 'game-event' && msg.payload.gameType === 'poll' && msg.payload.action === 'question')
          );

          // Add result message
          const pollEndMsg = {
            id: nanoid(),
            type: 'game-event',
            timestamp: Date.now(),
            sender: null,
            payload: {
              gameType: 'poll',
              action: 'result',
              data: {
                question: data.question,
                results: data.results
              }
            }
          };

          return [...withoutQuestion, pollEndMsg];
        });
        break;

      case 'pollCanceled':
        // Remove poll from state
        setPollState(null);
        // Remove poll message from messages
        setMessages(prev => prev.filter(msg =>
          !(msg.type === 'game-event' && msg.payload.gameType === 'poll' && msg.payload.action === 'question')
        ));
        break;

      case 'system':
        const systemMsg = {
          id: nanoid(),
          type: 'system',
          timestamp: Date.now(),
          sender: null,
          payload: {
            event: 'system_message',
            metadata: { message: data.message }
          }
        };
        setMessages(prev => [...prev, systemMsg]);
        break;

      case 'error':
        setError(data.message);
        setTimeout(() => setError(null), 5000);
        break;
    }
  };

  const handleSetName = (displayName) => {
    setUser({ displayName });
    localStorage.setItem('shoutbox_last_name', displayName);

    // Auto-join room if coming from share link
    if (autoJoinRoom) {
      setRoomCode(autoJoinRoom);
      setAppState(STATES.IN_ROOM);
      setAutoJoinRoom(null);
    } else {
      setAppState(STATES.NAMED);
    }
  };

  const handleCreateRoom = () => {
    // Generate 6-character room code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setRoomCode(code);
    setAppState(STATES.IN_ROOM);
  };

  const handleJoinRoom = (code) => {
    setRoomCode(code.toUpperCase());
    setAppState(STATES.IN_ROOM);
  };

  const handleLeaveRoom = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    setRoomCode(null);
    setMessages([]);
    setParticipants([]);
    setPollState(null);
    setIsHousemaster(false);
    setAppState(STATES.NAMED);
  };

  const handleSendMessage = (text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected. Please refresh.');
      return;
    }

    const chatMessage = {
      type: 'chat',
      data: {
        sessionId: sessionIdRef.current,
        text,
        target: 'ALL'
      }
    };

    console.log('📤 Sending chat:', chatMessage);
    wsRef.current.send(JSON.stringify(chatMessage));
  };

  const handleStartPoll = (question, options, settings = { showRealtime: false, duration: 10, multipleChoice: false }) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected. Please refresh.');
      return;
    }

    const pollMessage = {
      type: 'startPoll',
      data: {
        sessionId: sessionIdRef.current,
        question,
        options,
        showRealtime: settings.showRealtime,
        duration: settings.duration,
        multipleChoice: settings.multipleChoice
      }
    };

    console.log('📤 Starting poll:', pollMessage);
    wsRef.current.send(JSON.stringify(pollMessage));
  };

  const handleVote = (optionIndex) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected. Please refresh.');
      return;
    }

    // Optimistically update local state for instant feedback
    setPollState(prev => {
      let newUserVote;

      if (prev.multipleChoice) {
        // Toggle selection for multiple choice
        const currentVotes = Array.isArray(prev.userVote) ? prev.userVote : [];
        if (currentVotes.includes(optionIndex)) {
          // Remove vote
          newUserVote = currentVotes.filter(idx => idx !== optionIndex);
        } else {
          // Add vote
          newUserVote = [...currentVotes, optionIndex];
        }
      } else {
        // Single choice - replace vote
        newUserVote = optionIndex;
      }

      return {
        ...prev,
        userVote: newUserVote
      };
    });

    const voteMessage = {
      type: 'vote',
      data: {
        sessionId: sessionIdRef.current,
        optionIndex
      }
    };

    console.log('📤 Voting:', voteMessage);
    wsRef.current.send(JSON.stringify(voteMessage));
  };

  const handleEndPoll = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected. Please refresh.');
      return;
    }

    const endPollMessage = {
      type: 'endPoll',
      data: {
        sessionId: sessionIdRef.current
      }
    };

    console.log('📤 Ending poll:', endPollMessage);
    wsRef.current.send(JSON.stringify(endPollMessage));
  };

  const handleCancelPoll = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected. Please refresh.');
      return;
    }

    const cancelPollMessage = {
      type: 'cancelPoll',
      data: {
        sessionId: sessionIdRef.current
      }
    };

    console.log('📤 Canceling poll:', cancelPollMessage);
    wsRef.current.send(JSON.stringify(cancelPollMessage));

    // Optimistically remove poll from local state
    setPollState(null);
  };

  const handleTestsPass = () => {
    setAppState(STATES.ANONYMOUS);
  };

  const handleTestsFail = (report) => {
    console.error('Tests failed:', report);
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
          roomCode={roomCode}
          messages={messages}
          participants={participants.map(p => ({
            userId: p.id,
            displayName: p.name,
            isOnline: true,
            isHousemaster: p.isHousemaster || false
          }))}
          gameState={pollState}
          currentUser={{ userId: sessionIdRef.current, ...user }}
          isOwner={isHousemaster}
          onLeaveRoom={handleLeaveRoom}
          onSendMessage={handleSendMessage}
          onStartPoll={handleStartPoll}
          onVote={handleVote}
          onEndPoll={handleEndPoll}
          onCancelPoll={handleCancelPoll}
        />
      )}
    </div>
  );
}

export default App;
