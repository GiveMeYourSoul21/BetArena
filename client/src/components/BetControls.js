import React from 'react';
import './BlackjackGame.css';

const BetControls = ({ currentBet, maxBet, minBet, onBetChange, onPlaceBet, chips }) => {
  const betOptions = [10, 25, 50, 100];

  return (
    <div className="bet-controls">
      <h3 className="bet-title">Розмістіть ставку</h3>
      <div className="chips-display">
        <span>Ваші фішки: {chips}</span>
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
        <span>Поточна ставка: {currentBet}</span>
      </div>
      <div className="bet-slider" style={{ margin: '20px 0' }}>
        <input
          type="range"
          min={minBet}
          max={chips}
          step={1}
          value={currentBet}
          onChange={e => onBetChange(Number(e.target.value))}
          disabled={chips < minBet}
        />
        <div style={{ textAlign: 'center', color: '#FFD700', marginTop: 4 }}>
          {currentBet} фішок
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