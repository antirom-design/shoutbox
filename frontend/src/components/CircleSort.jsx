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
  const { gridSize, timeLimit, colorPalette, initialGrid, startTime } = gameData;

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
        <div className={`game-timer ${getTimerClass()}`}>
          ⏱️ {formatTime(timeLeft)}
        </div>
        <div className="game-stats">
          Clicks: {clicks}
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
            {matchCount === gridSize * gridSize ? '✅ Complete!' : '⏱️ Time\'s up!'}
          </span>
        ) : (
          <span>{matchCount}/{gridSize * gridSize} circles match</span>
        )}
      </div>
    </div>
  );
}

// Configuration Form for Creator
function CircleSortForm({ onSubmit, onCancel }) {
  const [gridSize, setGridSize] = useState(4);
  const [timeLimit, setTimeLimit] = useState(120);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ gridSize, timeLimit });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal circle-sort-form" onClick={(e) => e.stopPropagation()}>
        <h2>Start Circle Sorting Game</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <label className="form-label">Grid Size</label>
            <div className="grid-size-options">
              {[3, 4, 5].map(size => (
                <label key={size} className="radio-option">
                  <input
                    type="radio"
                    name="gridSize"
                    value={size}
                    checked={gridSize === size}
                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                  />
                  <span>{size}x{size} ({size * size} circles)</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Time Limit</label>
            <div className="time-limit-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="timeLimit"
                  value="60"
                  checked={timeLimit === 60}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                />
                <span>1 minute (Quick)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="timeLimit"
                  value="120"
                  checked={timeLimit === 120}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                />
                <span>2 minutes (Normal)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="timeLimit"
                  value="180"
                  checked={timeLimit === 180}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                />
                <span>3 minutes (Relaxed)</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Start Game
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

export { CircleSortGame, CircleSortForm };
