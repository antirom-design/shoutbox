import { useState } from 'react';

function NameInput({ onSubmit }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || name.length < 2 || name.length > 20) {
      setError('Name must be 2-20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setError('Only letters, numbers, dashes, and underscores allowed');
      return;
    }

    console.log('NameInput: Submitting name:', name);
    onSubmit(name);
  };

  return (
    <div className="card">
      <h1>Welcome to Shoutbox</h1>
      <p>Choose a display name to get started</p>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="name">Display Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Enter your name"
            autoFocus
            maxLength={20}
          />
          {error && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '8px' }}>{error}</p>}
        </div>

        <button type="submit" className="btn btn-primary">
          Continue
        </button>
      </form>
    </div>
  );
}

export default NameInput;
