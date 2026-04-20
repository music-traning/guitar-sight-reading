/**
 * MetronomeDisplay - Visual beat counter (1 & 2 & 3 & 4 &)
 */
import './MetronomeDisplay.css';

export default function MetronomeDisplay({ beat, subBeat, timeSignature = 4, isRunning }) {
  if (!isRunning) return null;

  const beats = Array.from({ length: timeSignature }, (_, i) => i);

  return (
    <div className="metro-display">
      {beats.map(i => (
        <div key={i} className="metro-beat-group">
          <div className={`metro-beat ${beat === i && !subBeat ? 'beat-active' : ''} ${i === 0 ? 'beat-accent' : ''}`}>
            {i + 1}
          </div>
          <div className={`metro-sub ${beat === i && subBeat ? 'sub-active' : ''}`}>
            &amp;
          </div>
        </div>
      ))}
    </div>
  );
}
