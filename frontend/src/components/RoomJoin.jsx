import { useState } from 'react';

function RoomJoin({ onCreateRoom, onJoinRoom, displayName }) {
  const [roomCode, setRoomCode] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();

    if (roomCode.length !== 6) {
      return;
    }

    onJoinRoom(roomCode.toUpperCase());
  };

  return (
    <div className="card">
      <h1>Hey, {displayName}!</h1>
      <p>Create a new room or join an existing one</p>

      <button className="btn btn-primary" onClick={onCreateRoom}>
        Create New Room
      </button>

      <div className="divider">or</div>

      <form onSubmit={handleJoin}>
        <div className="input-group">
          <label htmlFor="roomCode">Room Code</label>
          <input
            id="roomCode"
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="XJ9L2W"
            maxLength={6}
            style={{ textTransform: 'uppercase', textAlign: 'center', fontSize: '20px', letterSpacing: '2px' }}
          />
        </div>

        <button
          type="submit"
          className="btn btn-secondary"
          disabled={roomCode.length !== 6}
        >
          Join Room
        </button>
      </form>
    </div>
  );
}

export default RoomJoin;
