import { useState, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import './CalibrationScreen.css';

const CLICK_INTERVAL_MS = 1000; // 60 BPM
const TOTAL_CLICKS = 5;

export default function CalibrationScreen() {
  const { dispatch, t } = useApp();
  const [phase, setPhase] = useState('intro'); // intro | measuring | done | skipped
  const [clickCount, setClickCount] = useState(0);
  const [measuredMs, setMeasuredMs] = useState(null);
  const [log, setLog] = useState([]);

  const clickTimeRef = useRef(null);
  const timeoutRef = useRef(null);
  const audioCtxRef = useRef(null);

  const playClick = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // AudioContext blocked
    }
  }, []);

  const startCalibration = useCallback(async () => {
    setPhase('measuring');
    setClickCount(0);
    setLog([]);

    const runClick = (n) => {
      if (n > TOTAL_CLICKS) {
        setPhase('done');
        return;
      }
      setClickCount(n);
      playClick();
      clickTimeRef.current = performance.now();

      timeoutRef.current = setTimeout(() => runClick(n + 1), CLICK_INTERVAL_MS);
    };

    runClick(1);
  }, [playClick]);

  const handleUserTap = useCallback(() => {
    if (phase !== 'measuring' || clickTimeRef.current == null) return;
    const delta = performance.now() - clickTimeRef.current;
    const roundedDelta = Math.round(delta);
    setLog(prev => [...prev, roundedDelta]);
  }, [phase]);

  const handleSave = () => {
    const validEntries = log.filter(v => v > 0 && v < 1000);
    const avg = validEntries.length
      ? Math.round(validEntries.reduce((a, b) => a + b, 0) / validEntries.length)
      : 0;

    setMeasuredMs(avg);
    dispatch({ type: 'SET_LATENCY', ms: avg });
    dispatch({ type: 'SET_SCREEN', screen: 'placement' });
  };

  const handleSkip = () => {
    dispatch({ type: 'SET_LATENCY', ms: 0 });
    dispatch({ type: 'SET_SCREEN', screen: 'placement' });
  };

  const avgLatency = log.length
    ? Math.round(log.reduce((a, b) => a + b, 0) / log.length)
    : null;

  return (
    <div className="calibration-screen">
      <div className="calibration-card">
        <div className="calibration-header">
          <div className="calibration-icon">🎙️</div>
          <h1>{t('calibration.title')}</h1>
        </div>

        {phase === 'intro' && (
          <div className="calibration-intro">
            <p className="calibration-desc">{t('calibration.description')}</p>
            <p className="calibration-instruction">{t('calibration.instruction')}</p>

            <div className="calibration-actions">
              <button className="btn-primary" onClick={startCalibration}>
                {t('calibration.startButton')}
              </button>
              <button className="btn-secondary" onClick={handleSkip}>
                {t('calibration.skipButton')}
              </button>
            </div>

            <div className="calibration-note">
              <span>ℹ️</span>
              <span>{t('calibration.skipNote')}</span>
            </div>
          </div>
        )}

        {phase === 'measuring' && (
          <div className="calibration-measuring">
            <div className="click-indicator">
              <div className={`click-circle ${clickCount > 0 ? 'pulse' : ''}`}>
                <span>{clickCount} / {TOTAL_CLICKS}</span>
              </div>
              <p>{t('calibration.measuring')}</p>
            </div>

            <button
              className="tap-btn"
              onClick={handleUserTap}
            >
              🎸 {t('calibration.clickNow')}
            </button>

            <div className="latency-log">
              {log.map((v, i) => (
                <span key={i} className="latency-entry">{v}ms</span>
              ))}
            </div>

            {clickCount >= TOTAL_CLICKS && (
              <div className="calibration-done-actions">
                <p>{t('calibration.complete')}</p>
                {avgLatency != null && (
                  <p className="avg-result">
                    {t('calibration.latency')}: <strong>{avgLatency}ms</strong>
                  </p>
                )}
                <button className="btn-primary" onClick={handleSave}>
                  {t('calibration.saveAndContinue')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
