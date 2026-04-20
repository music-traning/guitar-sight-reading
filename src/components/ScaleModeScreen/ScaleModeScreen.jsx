import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SCALES, ALL_KEYS, generateScaleAbc } from '../../data/scales';
import ScoreDisplay from '../ScoreDisplay/ScoreDisplay';
import useMetronome from '../../hooks/useMetronome';
import usePitchDetector from '../../hooks/usePitchDetector';
import abcjs from 'abcjs';
import * as Tone from 'tone';
import MetronomeDisplay from '../shared/MetronomeDisplay';
import ManualAccordion from '../shared/ManualAccordion';
import CountInOverlay from '../shared/CountInOverlay';
import './ScaleModeScreen.css';

const CATEGORIES = ['basic', 'pentatonic', 'modal', 'advanced'];
const CAT_LABELS = { basic: '基礎', pentatonic: 'ペンタ系', modal: 'モーダル', advanced: '応用' };
const DIRECTIONS = ['ascending', 'descending', 'both'];

// Parse note names out of ABC body
function parseNotesFromAbc(abcString) {
  if (!abcString) return [];

  // 1. Strip the header (everything up to and including the K: key declaration)
  const parts = abcString.split(/^K:.*$/m);
  const body = parts.length > 1 ? parts[1] : abcString;
  
  // 2. Strip chord symbols (anything in double quotes)
  const noChords = body.replace(/"[^"]*"/g, '');

  const pattern = /[\^_=]?[A-Ga-g][,']*/g;
  const matches = [...noChords.matchAll(pattern)];
  return matches.map(m => {
    const raw = m[0];
    const letter = raw.replace(/[\^_=,'"]/g, '').toUpperCase();
    const hasSharp = raw.includes('^');
    const hasFlat = raw.includes('_');
    const name = hasSharp ? `${letter}#` : hasFlat ? `${letter}b` : letter;
    return { name, raw };
  });
}

// Check if detected note matches expected note
function noteMatches(detected, expected) {
  if (!detected || !expected) return false;
  const d = detected.name.replace('#', '♯').replace('b', '♭');
  const e = expected.name.replace('#', '♯').replace('b', '♭');
  if (d === e) return true;
  const enharmonics = {
    'C♯': 'D♭', 'D♯': 'E♭', 'F♯': 'G♭', 'G♯': 'A♭', 'A♯': 'B♭',
    'D♭': 'C♯', 'E♭': 'D♯', 'G♭': 'F♯', 'A♭': 'G♯', 'B♭': 'A♯',
  };
  return enharmonics[d] === e || d === enharmonics[e];
}

export default function ScaleModeScreen() {
  const { state, dispatch, t } = useApp();
  const [selectedScale, setSelectedScale] = useState(SCALES[0]);
  const [selectedKey, setSelectedKey] = useState('C');
  const [octaves, setOctaves] = useState(1);
  const [direction, setDirection] = useState('ascending');
  const [bpm, setBpm] = useState(80);
  const [activeCategory, setActiveCategory] = useState('basic');
  const [phase, setPhase] = useState('setup'); // setup | countin | playing | done
  const [showAchievements, setShowAchievements] = useState(false);
  const activeIdxRef = useRef(-1);
  const userHitCurrentRef = useRef(false);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [countInBeat, setCountInBeat] = useState(0);
  const [sessionLoops, setSessionLoops] = useState(0);
  
  const [isPlayingExample, setIsPlayingExample] = useState(false);
  const synthRef = useRef(null);
  const scoreRef = useRef(null);

  const metronome = useMetronome();
  const pitchDetector = usePitchDetector();

  const abcString = generateScaleAbc(selectedScale, selectedKey, bpm, octaves, direction);
  const progressKey = `${selectedScale.id}_${selectedKey}`;
  const isCleared = !!state.scaleProgress[progressKey];

  const filteredScales = SCALES.filter(s => s.category === activeCategory);
  
  // Track notes parsed from ABC
  const noteListRef = useRef([]);
  useEffect(() => {
    noteListRef.current = parseNotesFromAbc(abcString);
  }, [abcString]);

  const startPractice = async () => {
    // Force stop example playback
    if (synthRef.current) {
      synthRef.current.stop();
    }
    setIsPlayingExample(false);
    
    await pitchDetector.startListening(state.settings.micDeviceId, state.latencyOffset);
    
    setPhase('countin');
    setIsCountingIn(true);
    setCountInBeat(0);
    setSessionLoops(0);
    
    // Highlight first note to show user what to play during count-in
    scoreRef.current?.highlightNote(0);

    await metronome.countIn(4, bpm, (beat) => {
      setCountInBeat(beat);
    });

    setIsCountingIn(false);
    setPhase('playing');
    
    if (state.settings.metronome) {
      await metronome.start({
        bpm,
        timeSignature: 4,
        enabled: true,
        backbeatOnly: state.settings.backbeatOnly,
        volume: state.settings.volume,
      });
    }

    scoreRef.current?.startTiming(bpm, 0, (data) => {
      if (!data) {
         handleLoopEnd();
      } else {
         activeIdxRef.current = data.index;
         userHitCurrentRef.current = false;
      }
    });
  };

  const stopPractice = () => {
    scoreRef.current?.stopTiming();
    metronome.stop();
    pitchDetector.stopListening();
    if (synthRef.current) synthRef.current.stop();
    
    // Clear the active hints since we are aborting or ending explicitly
    document.querySelectorAll('.note-current, .note-passed, .note-correct').forEach(n => {
       n.classList.remove('note-current', 'note-passed', 'note-correct');
       n.querySelector('path')?.removeAttribute('stroke');
       n.querySelector('path')?.removeAttribute('fill');
    });
    
    if (sessionLoops > 0) {
      setPhase('done');
    } else {
      setPhase('setup');
    }
  };

  const playExample = async () => {
    if (isPlayingExample && synthRef.current) {
      synthRef.current.stop();
      setIsPlayingExample(false);
      return;
    }
    await Tone.start();
    if (!synthRef.current) {
      if (abcjs.synth.supportsAudio()) {
        synthRef.current = new abcjs.synth.CreateSynth();
      } else {
        alert("Audio not supported in this browser.");
        return;
      }
    }
    const visualObj = scoreRef.current?.getVisualObj?.();
    if (!visualObj) return;

    try {
      setIsPlayingExample(true);
      await synthRef.current.init({ audioContext: Tone.context.rawContext || new window.AudioContext(), visualObj });
      await synthRef.current.prime();
      synthRef.current.start();
    } catch (e) {
      console.error(e);
      setIsPlayingExample(false);
    }
  };

  const handleLoopEnd = () => {
    scoreRef.current?.stopTiming();
    dispatch({ type: 'SAVE_SCALE_PROGRESS', scaleId: selectedScale.id, key: selectedKey });
    dispatch({ type: 'ADD_CURRENCY', amount: 20 });
    dispatch({ type: 'ADD_EXP', amount: 15 });
    
    setSessionLoops(prev => prev + 1);

    // Give a short 1-beat breather or restart immediately
    // Since metronome click doesn't stop, restarting timing keeps it aligned
    scoreRef.current?.startTiming(bpm, 0, (data) => {
      if (!data) {
         handleLoopEnd();
      } else {
         activeIdxRef.current = data.index;
         userHitCurrentRef.current = false;
      }
    });
  };

  // Note pitch detection loop
  const lastDetectTimeRef = useRef(0);
  useEffect(() => {
    if (phase !== 'playing' || !pitchDetector.currentNote) return;
    
    const now = Date.now();
    if (now - lastDetectTimeRef.current < 150) return;

    const currentIdx = activeIdxRef.current;
    if (currentIdx === -1) return;

    const expected = noteListRef.current[currentIdx];
    if (!expected) return;

    const detected = pitchDetector.currentNote;
    if (!userHitCurrentRef.current && noteMatches(detected, expected)) {
      userHitCurrentRef.current = true;
      lastDetectTimeRef.current = now;
      
      const notes = scoreRef.current?.getNotes();
      if (notes && notes[currentIdx]) {
        notes[currentIdx].element?.classList.add('note-correct');
        notes[currentIdx].element?.querySelector('path')?.setAttribute('fill', '#4caf50');
        notes[currentIdx].element?.querySelector('path')?.setAttribute('stroke', '#4caf50');
      }
    }
  }, [pitchDetector.currentNote, phase]);


  const totalCells = SCALES.length * ALL_KEYS.length;
  const clearedCells = Object.keys(state.scaleProgress).length;

  return (
    <div className="scale-screen">
      {!showAchievements ? (
        <>
          <div className="scale-header">
            <h1>🎼 {t('scale.title')}</h1>
            <p>{t('scale.description')}</p>
            <button className="achievement-toggle-btn" onClick={() => setShowAchievements(true)}>
              📊 {t('scale.achievement')} {clearedCells}/{totalCells}
            </button>
          </div>

          {/* Category tabs */}
          <div className="scale-cat-tabs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {CAT_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Scale list */}
          <div className="scale-list">
            {filteredScales.map(scale => (
              <button
                key={scale.id}
                className={`scale-item ${selectedScale.id === scale.id ? 'selected' : ''}`}
                onClick={() => setSelectedScale(scale)}
              >
                <span>{scale.nameJa}</span>
                <span className="scale-item-en">{scale.nameEn}</span>
              </button>
            ))}
          </div>

          {/* Key selector */}
          <div className="key-grid">
            {ALL_KEYS.map(k => (
              <button
                key={k}
                className={`key-btn ${selectedKey === k ? 'selected' : ''} ${state.scaleProgress[`${selectedScale.id}_${k}`] ? 'cleared' : ''}`}
                onClick={() => setSelectedKey(k)}
              >
                {k}
                {state.scaleProgress[`${selectedScale.id}_${k}`] && <span className="key-check">✓</span>}
              </button>
            ))}
          </div>

          {/* Options */}
          <div className="scale-options">
            <div className="option-group">
              <label>{t('scale.octave')}</label>
              <div className="option-btns">
                <button className={`opt-btn ${octaves === 1 ? 'active' : ''}`} onClick={() => setOctaves(1)}>{t('scale.oneOctave')}</button>
                <button className={`opt-btn ${octaves === 2 ? 'active' : ''}`} onClick={() => setOctaves(2)}>{t('scale.twoOctaves')}</button>
              </div>
            </div>
            <div className="option-group">
              <label>{t('scale.direction')}</label>
              <div className="option-btns">
                {DIRECTIONS.map(d => {
                  const labels = { ascending: t('scale.ascending'), descending: t('scale.descending'), both: t('scale.both') };
                  return (
                    <button key={d} className={`opt-btn ${direction === d ? 'active' : ''}`} onClick={() => setDirection(d)}>
                      {labels[d]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="option-group bpm-group">
              <label>BPM: <strong>{bpm}</strong></label>
              <input type="range" min="40" max="240" step="4" value={bpm} onChange={e => setBpm(Number(e.target.value))} className="bpm-slider" />
            </div>
          </div>

          {/* Score preview */}
          <div className="scale-score-wrap">
            <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
              <ScoreDisplay ref={scoreRef} abcString={abcString} />
            </div>
            
            {isCountingIn && (
              <CountInOverlay beats={4} currentBeat={countInBeat} onComplete={() => {}} />
            )}
          </div>

          {/* Practice controls */}
          {phase === 'setup' && (
            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={playExample} style={{ flex: 1 }}>
                {isPlayingExample ? '⏹ 停止' : '🎧 お手本再生'}
              </button>
              <button className="btn-primary scale-start-btn" onClick={startPractice} style={{ flex: 2, margin: 0 }}>
                ▶ {t('scale.startPractice')}
              </button>
            </div>
          )}

          {phase === 'playing' && (
            <div className="scale-playing-controls">
              <MetronomeDisplay
                beat={metronome.beat}
                subBeat={metronome.subBeat}
                timeSignature={4}
                isRunning={metronome.isRunning}
              />
              <div className="mic-badge">
                🎙️
                <div className="mini-level-bar">
                  <div className="mini-level-fill" style={{ width: `${pitchDetector.micLevel * 100}%` }} />
                </div>
                {pitchDetector.currentNote && <span className="detected-note">{pitchDetector.currentNote.name}{pitchDetector.currentNote.octave}</span>}
              </div>
              <div className="scale-done-btns">
                <button className="btn-ghost" onClick={stopPractice}>⏹ 終了</button>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="scale-done-banner" style={{ background: 'rgba(30,30,40,0.9)', padding: '2rem', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ color: '#4caf50', margin: '0 0 1rem' }}>🎉 お疲れ様でした！</h2>
              <div style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
                <p>連続クリア: <strong>{sessionLoops} 周</strong></p>
                <p>獲得報酬: <strong>+{sessionLoops * 20}💎</strong> / <strong>+{sessionLoops * 15}EXP</strong></p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setShowAchievements(true)}>📊 達成記録を見る</button>
                <button className="btn-primary" onClick={() => setPhase('setup')}>戻る</button>
              </div>
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <ManualAccordion flagKey="scale" title={t('scale.manualTitle')} content={t('scale.manualContent')} />
          </div>
        </>
      ) : (
        /* Achievement matrix */
        <div className="achievement-screen">
          <div className="achievement-header">
            <button className="back-link" onClick={() => setShowAchievements(false)}>‹ 戻る</button>
            <h2>📊 {t('scale.achievement')}</h2>
            <span className="achievement-count">{clearedCells} / {totalCells}</span>
          </div>

          <div className="achievement-progress-bar">
            <div className="achievement-progress-fill" style={{ width: `${(clearedCells / totalCells) * 100}%` }} />
          </div>

          <div className="achievement-matrix">
            {/* Header row */}
            <div className="matrix-header">
              <div className="matrix-cell matrix-scale-label" />
              {ALL_KEYS.map(k => (
                <div key={k} className="matrix-cell matrix-key-label">{k}</div>
              ))}
            </div>
            {/* Scale rows */}
            {SCALES.map(scale => (
              <div key={scale.id} className="matrix-row">
                <div className="matrix-cell matrix-scale-label" title={scale.nameEn}>
                  {scale.nameJa.slice(0, 6)}
                </div>
                {ALL_KEYS.map(k => (
                  <div
                    key={k}
                    className={`matrix-cell matrix-check-cell ${state.scaleProgress[`${scale.id}_${k}`] ? 'cleared' : ''}`}
                    onClick={() => { setSelectedScale(scale); setSelectedKey(k); setShowAchievements(false); }}
                    title={`${scale.nameEn} - ${k}`}
                  >
                    {state.scaleProgress[`${scale.id}_${k}`] ? '✓' : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
