/**
 * CountInOverlay - full-screen countdown before practice starts
 */
import { useState, useEffect } from 'react';
import './CountInOverlay.css';

export default function CountInOverlay({ beats, currentBeat, onComplete }) {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (currentBeat > 0) {
      setAnimKey(k => k + 1);
    }
  }, [currentBeat]);

  if (currentBeat === 0) return null;

  return (
    <div className="count-in-overlay">
      <div key={animKey} className="count-in-number">
        {currentBeat}
      </div>
      <div className="count-in-label">COUNT IN</div>
      <div className="count-in-dots">
        {Array.from({ length: beats }).map((_, i) => (
          <div key={i} className={`count-dot ${i < currentBeat ? 'filled' : ''} ${i === currentBeat - 1 ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  );
}
