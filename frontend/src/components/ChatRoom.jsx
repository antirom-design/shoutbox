import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CircleSortGame, CircleSortForm } from './CircleSort';
import './ChatRoom.css';

function ChatRoom({
  roomCode,
  messages,
  participants,
  gameState,
  circleGameState,
  currentUser,
  isOwner = false,
  onLeaveRoom,
  onSendMessage,
  onInputChange,
  onStartPoll,
  onVote,
  onEndPoll,
  onCancelPoll,
  onStartGame,
  onSubmitGameResult
}) {
  const [messageText, setMessageText] = useState('');
  const [showPollForm, setShowPollForm] = useState(false);
  const [showGameForm, setShowGameForm] = useState(false);
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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
      // Clear the input which will trigger onInputChange with empty string
      // This will reset the typing timeout but we should explicitly stop typing
      if (onInputChange) {
        onInputChange('');
      }
    }
  };

  return (
    <div className="card card-wide">
      <div className="chat-header">
        <div className="header-top">
          <h2>Room: {roomCode}</h2>
          <div className="header-actions">
            <a className="header-link" onClick={onLeaveRoom}>
              <span className="link-icon">←</span> Leave
            </a>
            <a className="header-link" onClick={() => setShowShareModal(true)}>
              <span className="link-icon">🔗</span> Share
            </a>
          </div>
        </div>
        <div className="participants-bar">
          {participants.filter(p => p.isOnline).map(p => (
            <span
              key={p.userId}
              className={`participant-badge ${p.isHousemaster ? 'participant-housemaster' : ''} ${p.isTyping ? 'participant-typing' : ''} ${p.isWinner ? 'participant-winner' : ''}`}
            >
              {p.displayName}
            </span>
          ))}
        </div>
      </div>

      <div className="messages-container">
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            currentUserId={currentUser?.userId}
            gameState={gameState}
            circleGameState={circleGameState}
            isOwner={isOwner}
            onVote={onVote}
            onEndPoll={onEndPoll}
            onCancelPoll={onCancelPoll}
            onSubmitGameResult={onSubmitGameResult}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-footer">
        {isOwner && !gameState?.active && !circleGameState?.active && (
          <>
            <button
              className="btn-start-game-desktop"
              onClick={() => setShowPollForm(true)}
            >
              Start Poll
            </button>
            <button
              className="btn-start-game-desktop"
              onClick={() => setShowGameForm(true)}
            >
              Start Game
            </button>
            <button
              className="btn-start-game-mobile"
              onClick={() => setShowGameSelector(true)}
            >
              Start
            </button>
          </>
        )}

        <form onSubmit={handleSendMessage} className="message-form">
          <input
            type="text"
            value={messageText}
            onChange={(e) => {
              const newValue = e.target.value;
              setMessageText(newValue);
              if (onInputChange) {
                onInputChange(newValue);
              }
            }}
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
          onSubmit={(question, options, settings) => {
            onStartPoll(question, options, settings);
            setShowPollForm(false);
          }}
          onCancel={() => setShowPollForm(false)}
        />
      )}

      {showGameForm && (
        <CircleSortForm
          onSubmit={(config) => {
            onStartGame(config);
            setShowGameForm(false);
          }}
          onCancel={() => setShowGameForm(false)}
        />
      )}

      {showGameSelector && (
        <GameSelector
          onSelectPoll={() => {
            setShowGameSelector(false);
            setShowPollForm(true);
          }}
          onSelectCircleSort={() => {
            setShowGameSelector(false);
            setShowGameForm(true);
          }}
          onCancel={() => setShowGameSelector(false)}
        />
      )}

      {showShareModal && (
        <ShareModal
          roomCode={roomCode}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

function MessageItem({ message, currentUserId, gameState, circleGameState, isOwner, onVote, onEndPoll, onCancelPoll, onSubmitGameResult }) {
  const { type, payload, sender } = message;
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for active polls (only if endAt is set)
  useEffect(() => {
    if (type === 'game-event' && payload.gameType === 'poll' && payload.action === 'question' && gameState?.active && gameState?.endAt) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((gameState.endAt - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    } else if (type === 'game-event' && payload.gameType === 'poll' && payload.action === 'question' && gameState?.active && !gameState?.endAt) {
      // No time limit - set countdown to -1 to indicate unlimited
      setCountdown(-1);
    }
  }, [type, payload, gameState?.active, gameState?.endAt]);

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
      const isActive = gameState?.active;
      const showRealtime = gameState?.showRealtime || false;
      const userVote = gameState?.userVote;
      const multipleChoice = gameState?.multipleChoice || false;
      const hasTimeLimit = countdown >= 0;

      // Timer color based on remaining time
      const timerClass = countdown > 5 ? 'timer-green' : countdown > 2 ? 'timer-orange' : 'timer-red';

      return (
        <div className="game-event">
          <div className="poll-question">
            <div className="poll-header">
              <h3>{payload.data.question}</h3>
              {isActive && hasTimeLimit && (
                <div className={`poll-timer ${timerClass}`}>
                  ⏱️ {countdown}s
                </div>
              )}
            </div>
            {multipleChoice && isActive && (
              <div className="poll-hint">Select one or more options</div>
            )}
            <div className="poll-options">
              {payload.data.options.map((option, idx) => {
                const optionData = gameState?.options?.[idx];
                const voteCount = optionData?.votes?.length || 0;
                const totalVotes = gameState?.options?.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0) || 0;
                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                // Check if user voted for this option (handle both single choice and multiple choice)
                const isUserVote = multipleChoice
                  ? (Array.isArray(userVote) && userVote.includes(idx))
                  : userVote === idx;

                // Show results if: not active OR showRealtime is enabled
                const showResults = !isActive || showRealtime;

                return (
                  <button
                    key={idx}
                    className={`poll-option ${isUserVote ? 'poll-option-selected' : ''}`}
                    onClick={() => onVote(idx)}
                    disabled={!isActive}
                  >
                    {showResults && (
                      <div className="poll-option-bar" style={{ width: `${percentage}%` }} />
                    )}
                    <span className="poll-option-text">
                      {option}
                      {isUserVote && ' ✓'}
                    </span>
                    {showResults && (
                      <span className="poll-option-count">{voteCount} ({percentage}%)</span>
                    )}
                  </button>
                );
              })}
            </div>

            {isOwner && isActive && (
              <div className="poll-controls">
                <button
                  className="btn-poll-control btn-end-poll"
                  onClick={() => onEndPoll()}
                >
                  End Poll
                </button>
                <button
                  className="btn-poll-control btn-cancel-poll"
                  onClick={() => onCancelPoll()}
                >
                  Cancel Poll
                </button>
              </div>
            )}
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

    if (payload.gameType === 'circle-sort' && payload.action === 'start') {
      const isActive = circleGameState?.active;

      return (
        <div className="game-event">
          <CircleSortGame
            gameData={payload.data}
            currentUserId={currentUserId}
            isActive={isActive}
            onSubmitResult={onSubmitGameResult}
          />
        </div>
      );
    }

    if (payload.gameType === 'circle-sort' && payload.action === 'result') {
      const { results, gridSize, timeLimit, round, totalRounds } = payload.data;

      return (
        <div className="game-event">
          <div className="circle-sort-result">
            <h3>Results {round ? `— Round ${round}/${totalRounds}` : ''}</h3>
            <div className="game-info">
              <span>{gridSize}×{gridSize}</span>
              <span>{timeLimit}s</span>
            </div>
            <div className="leaderboard">
              {results.slice(0, 3).map((result, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={idx} className="leaderboard-item">
                    <span className="medal">{medals[idx]}</span>
                    <span className="player-name">{result.userName}</span>
                    <div className="player-stats">
                      <span>{result.completionTime}s</span>
                      <span>{result.clicks}</span>
                      <span className="score">{result.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (payload.gameType === 'circle-sort' && payload.action === 'final') {
      const { results, totalRounds } = payload.data;

      return (
        <div className="game-event">
          <div className="circle-sort-result">
            <h3>Final Results — {totalRounds} {totalRounds === 1 ? 'Round' : 'Rounds'}</h3>
            <div className="leaderboard">
              {results.slice(0, 3).map((result, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={idx} className="leaderboard-item">
                    <span className="medal">{medals[idx]}</span>
                    <span className="player-name">{result.userName}</span>
                    <div className="player-stats">
                      <span className="score">{result.score} total</span>
                    </div>
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
  const [showRealtime, setShowRealtime] = useState(false);
  const [hasTimeLimit, setHasTimeLimit] = useState(true);
  const [duration, setDuration] = useState(10);
  const [multipleChoice, setMultipleChoice] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    const validOptions = options.filter(opt => opt.trim());

    if (question.trim() && validOptions.length >= 2) {
      onSubmit(question, validOptions, {
        showRealtime,
        duration: hasTimeLimit ? duration : null,
        multipleChoice
      });
    }
  };

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (idx) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal poll-form-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create Poll</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <label className="form-label">Question</label>
            <input
              type="text"
              className="form-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What's your favorite color?"
              autoFocus
              maxLength={200}
            />
          </div>

          <div className="form-section">
            <label className="form-label">Options</label>
            <div className="poll-options-input">
              {options.map((opt, idx) => (
                <div key={idx} className="poll-option-input-row">
                  <input
                    type="text"
                    className="form-input"
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[idx] = e.target.value;
                      setOptions(newOptions);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      className="btn-remove-option"
                      onClick={() => removeOption(idx)}
                      title="Remove option"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 4 && (
              <button type="button" className="btn-add-option" onClick={addOption}>
                + Add Option
              </button>
            )}
          </div>

          <div className="form-section poll-settings">
            <label className="form-label">Settings</label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={multipleChoice}
                onChange={(e) => setMultipleChoice(e.target.checked)}
              />
              <span>Allow multiple choice</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showRealtime}
                onChange={(e) => setShowRealtime(e.target.checked)}
              />
              <span>Show results in real-time</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasTimeLimit}
                onChange={(e) => setHasTimeLimit(e.target.checked)}
              />
              <span>Set time limit</span>
            </label>

            {hasTimeLimit && (
              <div className="time-limit-input">
                <label className="form-sublabel">Voting time</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-input-small"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(5, Math.min(120, parseInt(e.target.value) || 10)))}
                    min="5"
                    max="120"
                  />
                  <span className="form-unit">seconds</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Start Poll
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GameSelector({ onSelectPoll, onSelectCircleSort, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal game-selector-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Start Game</h2>

        <div className="game-list">
          <button
            className="game-list-item"
            onClick={onSelectPoll}
          >
            <div className="game-list-icon">📊</div>
            <div className="game-list-content">
              <div className="game-list-title">Poll</div>
              <div className="game-list-description">Quick voting & feedback</div>
            </div>
          </button>

          <button
            className="game-list-item"
            onClick={onSelectCircleSort}
          >
            <div className="game-list-icon">🎯</div>
            <div className="game-list-content">
              <div className="game-list-title">Circle Sort</div>
              <div className="game-list-description">Match colors puzzle</div>
            </div>
          </button>
        </div>

        <button
          type="button"
          className="btn-text"
          onClick={onCancel}
          style={{ width: '100%', marginTop: '16px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ShareModal({ roomCode, onClose }) {
  const shareUrl = `${window.location.origin}/?room=${roomCode}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Join Room {roomCode}</h2>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          margin: '20px 0'
        }}>
          <QRCodeSVG value={shareUrl} size={200} />
        </div>

        <p style={{ textAlign: 'center', marginBottom: '20px' }}>
          Scan to join this room
        </p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onClose}
          style={{ width: '100%' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default ChatRoom;
