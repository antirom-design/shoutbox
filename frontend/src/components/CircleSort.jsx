import { useState, useEffect, useRef } from 'react';
import './CircleSort.css';

// Circle component with bounce animation
function Circle({ color, onClick, disabled }) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setIsAnimating(true);
    onClick();
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <div
      className={`circle ${isAnimating ? 'circle-bounce' : ''}`}
      style={{ backgroundColor: color }}
      onClick={handleClick}
    />
  );
}

// Main Circle Sort Game Component
function CircleSortGame({
  gameData,
  currentUserId,
  isActive,
  onSubmitResult
}) {
  const { gridSize, timeLimit, colorPalette, initialGrid, startTime, currentRound, totalRounds } = gameData;

  const [grid, setGrid] = useState(initialGrid);
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Calculate time left
  useEffect(() => {
    if (!isActive || hasSubmitted) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0) {
        // Timeout
        handleTimeout();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, hasSubmitted, startTime, timeLimit]);

  // Check for matches
  useEffect(() => {
    if (!grid) return;

    const firstColor = grid[0][0];
    let matches = 0;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (grid[y][x] === firstColor) {
          matches++;
        }
      }
    }

    setMatchCount(matches);

    // Check win condition
    if (matches === gridSize * gridSize && !hasSubmitted) {
      handleWin();
    }
  }, [grid, gridSize, hasSubmitted]);

  const handleClick = (x, y) => {
    if (!isActive || hasSubmitted) return;

    setClicks(prev => prev + 1);

    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      const currentColorIndex = colorPalette.indexOf(newGrid[y][x]);
      const nextColorIndex = (currentColorIndex + 1) % colorPalette.length;
      newGrid[y][x] = colorPalette[nextColorIndex];
      return newGrid;
    });
  };

  const handleWin = () => {
    const completionTime = (Date.now() - startTime) / 1000;
    const score = Math.max(0, (timeLimit - completionTime) * 100 - clicks * 5);

    setHasSubmitted(true);
    onSubmitResult({
      completionTime: parseFloat(completionTime.toFixed(1)),
      clicks,
      score: Math.round(score),
      completed: true
    });
  };

  const handleTimeout = () => {
    if (hasSubmitted) return;

    setHasSubmitted(true);
    onSubmitResult({
      completionTime: null,
      clicks,
      score: 0,
      completed: false
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    const percent = (timeLeft / timeLimit) * 100;
    if (percent > 50) return 'timer-green';
    if (percent > 25) return 'timer-orange';
    return 'timer-red';
  };

  return (
    <div className="circle-sort-game">
      <div className="game-header">
        <div className="game-round">
          {currentRound}/{totalRounds}
        </div>
        <div className={`game-timer ${getTimerClass()}`}>
          {formatTime(timeLeft)}
        </div>
        <div className="game-stats">
          {clicks}
        </div>
      </div>

      <div
        className="circle-grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`
        }}
      >
        {grid && grid.map((row, y) =>
          row.map((color, x) => (
            <Circle
              key={`${x}-${y}`}
              color={color}
              onClick={() => handleClick(x, y)}
              disabled={!isActive || hasSubmitted}
            />
          ))
        )}
      </div>

      <div className="game-progress">
        {hasSubmitted ? (
          <span className="game-complete">
            {matchCount === gridSize * gridSize ? 'Complete' : 'Time up'}
          </span>
        ) : (
          <span>{matchCount}/{gridSize * gridSize}</span>
        )}
      </div>
    </div>
  );
}

// Configuration Form for Creator
function CircleSortForm({ onSubmit, onCancel }) {
  const [mode, setMode] = useState('classic'); // 'classic' or 'tournament'
  const [gridSize, setGridSize] = useState(4);
  const [timeLimit, setTimeLimit] = useState(120);
  const [rounds, setRounds] = useState(1);
  const [colorCount, setColorCount] = useState(3);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'tournament') {
      onSubmit({
        tournament: true,
        rounds: 3,
        colorCount: 2
      });
    } else {
      onSubmit({ gridSize, timeLimit, rounds, colorCount });
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal circle-sort-form" onClick={(e) => e.stopPropagation()}>
        <h2>Circle Sort</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <label className="form-label">Mode</label>
            <div className="button-group">
              <button
                type="button"
                className={`option-btn ${mode === 'classic' ? 'active' : ''}`}
                onClick={() => setMode('classic')}
              >
                Classic
              </button>
              <button
                type="button"
                className={`option-btn ${mode === 'tournament' ? 'active' : ''}`}
                onClick={() => setMode('tournament')}
              >
                Tournament 🏆
              </button>
            </div>
          </div>

          {mode === 'tournament' && (
            <div className="tournament-info">
              <p className="tournament-description">
                <strong>3 Progressive Rounds:</strong>
              </p>
              <ul className="tournament-rounds">
                <li>Round 1: 2×2 grid, 10 sec</li>
                <li>Round 2: 4×4 grid, 20 sec</li>
                <li>Round 3: 8×8 grid, 30 sec</li>
              </ul>
              <p className="tournament-note">All rounds: 2 colors only</p>
            </div>
          )}

          {mode === 'classic' && (
            <>
          <div className="form-section">
            <label className="form-label">Grid</label>
            <div className="button-group">
              {[3, 4, 5].map(size => (
                <button
                  key={size}
                  type="button"
                  className={`option-btn ${gridSize === size ? 'active' : ''}`}
                  onClick={() => setGridSize(size)}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Time</label>
            <div className="button-group">
              <button
                type="button"
                className={`option-btn ${timeLimit === 60 ? 'active' : ''}`}
                onClick={() => setTimeLimit(60)}
              >
                60s
              </button>
              <button
                type="button"
                className={`option-btn ${timeLimit === 120 ? 'active' : ''}`}
                onClick={() => setTimeLimit(120)}
              >
                120s
              </button>
              <button
                type="button"
                className={`option-btn ${timeLimit === 180 ? 'active' : ''}`}
                onClick={() => setTimeLimit(180)}
              >
                180s
              </button>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Rounds</label>
            <div className="button-group">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  type="button"
                  className={`option-btn ${rounds === r ? 'active' : ''}`}
                  onClick={() => setRounds(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Colors</label>
            <div className="button-group">
              {[2, 3, 4, 5].map(c => (
                <button
                  key={c}
                  type="button"
                  className={`option-btn ${colorCount === c ? 'active' : ''}`}
                  onClick={() => setColorCount(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          </>
          )}

          <div className="form-actions">
            <button type="button" className="btn-text" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Start
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { CircleSortGame, CircleSortForm };
