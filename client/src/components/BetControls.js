import React from 'react';
import './BlackjackGame.css';

const BetControls = ({ currentBet, maxBet, minBet, onBetChange, onPlaceBet, chips }) => {
  const betOptions = [10, 25, 50, 100];

  return (
    <div className="bet-controls">
      <h3 className="bet-title">Розмістіть ставку</h3>
      <div className="chips-display">
        <span>Ваші фішки: <strong style={{color: '#FFD700'}}>{chips}</strong></span>
      </div>
      <div className="bet-buttons">
        {betOptions.map((bet) => (
          <button
            key={bet}
            className={`chip-button ${currentBet === bet ? 'selected' : ''}`}
            onClick={() => onBetChange(bet)}
            disabled={bet > chips}
          >
            {bet}
          </button>
        ))}
      </div>
      <div className="bet-amount">
        <span>Поточна ставка: <strong style={{color: '#FFD700'}}>{currentBet}</strong></span>
      </div>
      <div className="bet-slider" style={{ margin: '25px 0', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#FFD700', fontSize: '14px' }}>
          <span>{minBet}</span>
          <span>{chips}</span>
        </div>
        <div style={{ position: 'relative', padding: '0 15px' }}>
          <input
            type="range"
            min={minBet}
            max={chips}
            step={5}
            value={currentBet}
            onChange={e => onBetChange(Number(e.target.value))}
            disabled={chips < minBet}
            style={{
              width: '100%',
              height: '15px',
              background: 'linear-gradient(to right, #4a5568 0%, #4a5568 ' + ((currentBet - minBet) / (chips - minBet) * 100) + '%, #2d3748 ' + ((currentBet - minBet) / (chips - minBet) * 100) + '%, #2d3748 100%)',
              borderRadius: '8px',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>
      <button
        className="place-bet-button"
        onClick={onPlaceBet}
        disabled={currentBet > chips}
      >
        Зробити ставку
      </button>
    </div>
  );
};

export default BetControls; 