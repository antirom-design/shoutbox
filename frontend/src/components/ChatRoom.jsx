import { useState, useEffect, useRef } from 'react';
import './ChatRoom.css';

function ChatRoom({
  roomCode,
  messages,
  participants,
  gameState,
  currentUser,
  isOwner = false,
  onLeaveRoom,
  onSendMessage,
  onStartPoll,
  onVote
}) {
  const [messageText, setMessageText] = useState('');
  const [showPollForm, setShowPollForm] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText('');
    }
  };

  return (
    <div className="card card-wide">
      <div className="chat-header">
        <div>
          <h2>Room: {roomCode}</h2>
          <div className="participants-bar">
            {participants.filter(p => p.isOnline).map(p => (
              <span key={p.userId} className="participant-badge">
                {p.displayName}
              </span>
            ))}
          </div>
        </div>
        <button className="btn-leave" onClick={onLeaveRoom}>
          Leave
        </button>
      </div>

      <div className="messages-container">
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            currentUserId={currentUser?.userId}
            gameState={gameState}
            onVote={onVote}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-footer">
        {isOwner && !gameState?.activeGame && (
          <button
            className="btn-start-poll"
            onClick={() => setShowPollForm(true)}
          >
            Start Poll
          </button>
        )}

        <form onSubmit={handleSendMessage} className="message-form">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
          />
          <button type="submit" disabled={!messageText.trim()}>
            Send
          </button>
        </form>
      </div>

      {showPollForm && (
        <PollForm
          onSubmit={(question, options) => {
            onStartPoll(question, options);
            setShowPollForm(false);
          }}
          onCancel={() => setShowPollForm(false)}
        />
      )}
    </div>
  );
}

function MessageItem({ message, currentUserId, gameState, onVote }) {
  const { type, payload, sender } = message;

  if (type === 'chat') {
    const isOwnMessage = sender === currentUserId;

    return (
      <div className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}>
        {!isOwnMessage && (
          <div className="message-author">{payload.displayName}</div>
        )}
        <div className="message-bubble">
          {payload.text}
        </div>
      </div>
    );
  }

  if (type === 'system') {
    return (
      <div className="message-system">
        {payload.event === 'user_joined' && `${payload.metadata.userName} joined`}
        {payload.event === 'user_left' && `${payload.metadata.userName} left`}
        {payload.event === 'room_created' && `Room created`}
      </div>
    );
  }

  if (type === 'game-event') {
    if (payload.gameType === 'poll' && payload.action === 'question') {
      return (
        <div className="game-event">
          <div className="poll-question">
            <h3>{payload.data.question}</h3>
            <div className="poll-options">
              {payload.data.options.map((option, idx) => {
                const voteCount = gameState?.gameData?.options[idx]?.votes?.length || 0;
                const totalVotes = gameState?.gameData?.options.reduce((sum, opt) => sum + opt.votes.length, 0) || 0;
                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                const hasVoted = gameState?.gameData?.options[idx]?.votes?.includes(currentUserId);

                return (
                  <button
                    key={idx}
                    className={`poll-option ${hasVoted ? 'poll-option-voted' : ''}`}
                    onClick={() => onVote(idx)}
                    disabled={!gameState?.active}
                  >
                    <div className="poll-option-bar" style={{ width: `${percentage}%` }} />
                    <span className="poll-option-text">{option}</span>
                    <span className="poll-option-count">{voteCount}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (payload.gameType === 'poll' && payload.action === 'result') {
      const totalVotes = payload.data.results.reduce((sum, opt) => sum + opt.votes.length, 0);

      return (
        <div className="game-event">
          <div className="poll-result">
            <h3>Poll Results: {payload.data.question}</h3>
            <div className="poll-options">
              {payload.data.results.map((option, idx) => {
                const percentage = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;

                return (
                  <div key={idx} className="poll-result-item">
                    <div className="poll-result-bar" style={{ width: `${percentage}%` }} />
                    <span className="poll-result-text">{option.text}</span>
                    <span className="poll-result-count">{option.votes.length} ({percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}

function PollForm({ onSubmit, onCancel }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleSubmit = (e) => {
    e.preventDefault();

    const validOptions = options.filter(opt => opt.trim());

    if (question.trim() && validOptions.length >= 2) {
      onSubmit(question, validOptions);
    }
  };

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, '']);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create Poll</h2>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What's your favorite color?"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label>Options</label>
            {options.map((opt, idx) => (
              <input
                key={idx}
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOptions = [...options];
                  newOptions[idx] = e.target.value;
                  setOptions(newOptions);
                }}
                placeholder={`Option ${idx + 1}`}
                style={{ marginBottom: '8px' }}
              />
            ))}
          </div>

          {options.length < 4 && (
            <button type="button" className="btn btn-secondary" onClick={addOption}>
              Add Option
            </button>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Start Poll
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatRoom;
