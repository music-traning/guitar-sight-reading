/**
 * PracticeScreen - Core practice loop
 * Handles: Count-in → Note highlighting → Pitch detection → Combo → Result
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import ScoreDisplay from '../ScoreDisplay/ScoreDisplay';
import CountInOverlay from '../shared/CountInOverlay';
import ComboDisplay, { getComboTier } from '../shared/ComboDisplay';
import MetronomeDisplay from '../shared/MetronomeDisplay';
import usePitchDetector from '../../hooks/usePitchDetector';
import useMetronome from '../../hooks/useMetronome';
import { CIRCLE_OF_FIFTHS, KEY_STAGES } from '../../data/songs';
import abcjs from 'abcjs';
import * as Tone from 'tone';
import './PracticeScreen.css';

const NOTE_TIMEOUT_BEATS = 1; // auto-skip after 1 beat of silence (faster progression if stuck)

// Parse note names out of ABC body (very simplified)
function parseNotesFromAbc(abcString) {
  if (!abcString) return [];
  
  // 1. Strip the header (everything up to and including the K: key declaration)
  const parts = abcString.split(/^K:.*$/m);
  const body = parts.length > 1 ? parts[1] : abcString;
  
  // 2. Strip chord symbols (anything in double quotes)
  const noChords = body.replace(/"[^"]*"/g, '');

  // Match note tokens: optional accidental + pitch letter + optional octave modifiers
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

// Check if detected note matches expected note (ignoring octave)
function noteMatches(detected, expected) {
  if (!detected || !expected) return false;
  const d = detected.name.replace('#', '♯').replace('b', '♭');
  const e = expected.name.replace('#', '♯').replace('b', '♭');
  if (d === e) return true;
  // Enharmonic check
  const enharmonics = {
    'C♯': 'D♭', 'D♯': 'E♭', 'F♯': 'G♭', 'G♯': 'A♭', 'A♯': 'B♭',
    'D♭': 'C♯', 'E♭': 'D♯', 'G♭': 'F♯', 'A♭': 'G♯', 'B♭': 'A♯',
  };
  return enharmonics[d] === e || d === enharmonics[e];
}

export default function PracticeScreen({ song, stageId, initialKey, onExit }) {
  const { state, dispatch, t } = useApp();
  const { settings, latencyOffset } = state;

  const keyStage = KEY_STAGES[stageId];
  const keys = keyStage?.keys || [initialKey || 'C'];
  const totalLoops = keyStage?.loops || 1;

  // Refs for values needed in callbacks
  const noteListRef = useRef([]);
  const noteIdxRef = useRef(0);
  const correctRef = useRef(0);
  const totalRef = useRef(0);
  const silenceBeatsRef = useRef(0);
  const comboRef = useRef(0);
  const lastDetectTimeRef = useRef(0);

  // State
  const [phase, setPhase] = useState('setup'); // setup | countin | playing | result
  const [currentLoop, setCurrentLoop] = useState(0);
  const activeIdxRef = useRef(-1);
  const userHitCurrentRef = useRef(false);
  const [currentKeyIdx, setCurrentKeyIdx] = useState(0);
  const [combo, setCombo] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);
  const [lastFeedback, setLastFeedback] = useState(null); // 'correct'|'miss'
  const [countInBeat, setCountInBeat] = useState(0);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [bpm, setBpm] = useState(song?.recommendedBpm || 80);
  const [useMetronomeOn, setUseMetronomeOn] = useState(settings.metronome);
  const [resultInfo, setResultInfo] = useState(null);
  const [showTransitionBanner, setShowTransitionBanner] = useState(false);
  const [transitionNewKey, setTransitionNewKey] = useState('');

  // Active items
  const [activeNoteHint, setActiveNoteHint] = useState(false);
  const [activIntervalHint, setActiveIntervalHint] = useState(false);
  const [activeSlowStart, setActiveSlowStart] = useState(false);
  
  const [isPlayingExample, setIsPlayingExample] = useState(false);
  const synthRef = useRef(null);

  const currentKey = keys[currentKeyIdx] || 'C';
  const abcString = song?.getAbc(currentKey, bpm) || '';

  const scoreRef = useRef(null);
  const pitchDetector = usePitchDetector();
  const metronome = useMetronome();

  // Parse notes when abc changes
  useEffect(() => {
    const notes = parseNotesFromAbc(abcString);
    noteListRef.current = notes;
    totalRef.current += notes.length;
  }, [abcString]);

  // ── Start Practice ─────────────────────────────
  const handleStart = useCallback(async () => {
    // Force stop example playback 
    if (synthRef.current) {
      synthRef.current.stop();
    }
    setIsPlayingExample(false);

    // Request mic first
    await pitchDetector.startListening(settings.micDeviceId, latencyOffset);

    setPhase('countin');
    setIsCountingIn(true);
    setCurrentLoop(0);
    noteIdxRef.current = 0;
    setCountInBeat(0);

    const beats = song?.timeSignature?.startsWith('3') ? 3
      : song?.timeSignature?.startsWith('5') ? 5 : 4;

    // Run count-in using metronome
    await metronome.countIn(beats, bpm, (beat) => {
      setCountInBeat(beat);
    });

    setIsCountingIn(false);
    setPhase('playing');

    // Start metronome if enabled
    if (useMetronomeOn) {
      await metronome.start({
        bpm,
        timeSignature: parseInt(song?.timeSignature?.split('/')[0] || '4'),
        enabled: useMetronomeOn,
        backbeatOnly: settings.backbeatOnly,
        volume: settings.volume,
        onBeat: (beat, isSub) => {
          if (!isSub) {
            silenceBeatsRef.current++;
          }
        },
      });
    }

    // Call startTiming for auto-scrolling cursor exactly when metronome starts
    scoreRef.current?.startTiming(bpm, 0, (data) => {
      if (!data) {
        // null means piece is finished
        handleLoopEnd();
      } else {
        activeIdxRef.current = data.index;
        userHitCurrentRef.current = false; // Reset hit flag for the new note
        // Add note count since we don't extract manually
        totalRef.current = noteListRef.current.length;
      }
    });

  }, [bpm, metronome, pitchDetector, settings, song, useMetronomeOn, latencyOffset]);

  // ── Pitch detection logic ──────────────────────
  useEffect(() => {
    if (phase !== 'playing' || !pitchDetector.currentNote) return;
    
    // 150ms debounce to prevent double-triggering real notes while allowing fast 8th/16th notes
    const now = Date.now();
    if (now - lastDetectTimeRef.current < 150) return;

    const currentIdx = activeIdxRef.current;
    if (currentIdx === -1) return;

    const expected = noteListRef.current[currentIdx];
    if (!expected) return;

    const detected = pitchDetector.currentNote;
    const isMatch = noteMatches(detected, expected);

    // Only register one correct hit per note window
    if (!userHitCurrentRef.current && isMatch) {
        userHitCurrentRef.current = true;
        
        lastDetectTimeRef.current = now;
        silenceBeatsRef.current = 0;
        correctRef.current++;
        comboRef.current++;
        setTotalCorrect(c => c + 1);
        setCombo(comboRef.current);
        setLastFeedback('correct');

        setTimeout(() => setLastFeedback(null), 400);

        // Turn the current note green to indicate it was hit
        const notes = scoreRef.current?.getNotes();
        if (notes && notes[currentIdx]) {
          notes[currentIdx].element?.classList.add('note-correct');
          // Add custom CSS to make it green
          notes[currentIdx].element?.querySelector('path')?.setAttribute('fill', '#4caf50');
          notes[currentIdx].element?.querySelector('path')?.setAttribute('stroke', '#4caf50');
        }
      }
  }, [pitchDetector.currentNote, phase]);

  const finishPractice = useCallback(() => {
    scoreRef.current?.stopTiming();
    metronome.stop();
    pitchDetector.stopListening();

    const accuracy = totalRef.current > 0
      ? Math.round((correctRef.current / totalRef.current) * 100)
      : 0;
    const tier = getComboTier(comboRef.current);
    const baseExp = 50 + accuracy;
    const expGained = Math.round(baseExp * tier.multiplier);
    const currencyGained = Math.round(30 * tier.currencyMult);
    const titleKey = `${song.id}_${stageId}`;
    const passed = accuracy >= 60;

    setResultInfo({ accuracy, expGained, currencyGained, passed, titleKey });
    setPhase('result');

    if (passed) {
      dispatch({ type: 'ADD_EXP', amount: expGained });
      dispatch({ type: 'ADD_CURRENCY', amount: currencyGained });
      dispatch({ type: 'EARN_TITLE', songId: song.id, stage: stageId });
      dispatch({ type: 'SAVE_PROGRESS', songId: song.id, stage: stageId, score: accuracy, accuracy });
      dispatch({ type: 'UPDATE_STREAK' });
      dispatch({
        type: 'ADD_SCORE_HISTORY',
        entry: { songTitle: song.titleEn, score: accuracy, accuracy, date: Date.now() },
      });
    }
  }, [dispatch, metronome, pitchDetector, song, stageId]);

  const handleLoopEnd = useCallback(() => {
    scoreRef.current?.stopTiming();
    activeIdxRef.current = -1;

    // Evaluate combo saves if they missed a ton
    if (correctRef.current < totalRef.current && comboRef.current > 0) {
       // Just reset combo
       setCombo(0);
       comboRef.current = 0;
    }

    // End of current loop
    const nextLoopNum = currentLoop + 1;

    if (nextLoopNum >= totalLoops) {
      // All done!
      finishPractice();
    } else {
      // Next key
      const nextKeyIdx = (currentKeyIdx + 1) % keys.length;
      const nextKey = keys[nextKeyIdx];

      if (settings.transpositionCountIn && nextLoopNum > 0) {
        // Show transition banner + count-in for next key
        setShowTransitionBanner(true);
        setTransitionNewKey(nextKey);
        metronome.stop();

        setTimeout(async () => {
          setShowTransitionBanner(false);
          setCurrentKeyIdx(nextKeyIdx);
          setCurrentLoop(nextLoopNum);
          
          setIsCountingIn(true);
          setPhase('countin');
          const beats = song?.timeSignature?.startsWith('3') ? 3 : 4;
          await metronome.countIn(beats, bpm, setCountInBeat);
          setIsCountingIn(false);
          setPhase('playing');

          if (useMetronomeOn) {
            await metronome.start({
              bpm,
              timeSignature: parseInt(song?.timeSignature?.split('/')[0] || '4'),
              enabled: useMetronomeOn,
              backbeatOnly: settings.backbeatOnly,
              volume: settings.volume,
            });
          }

          scoreRef.current?.startTiming(bpm, 0, (data) => {
            if (!data) handleLoopEnd();
            else {
              activeIdxRef.current = data.index;
              userHitCurrentRef.current = false;
            }
          });
        }, 1800);
      } else {
        setCurrentKeyIdx(nextKeyIdx);
        setCurrentLoop(nextLoopNum);
        
        // Immediately restart timing for next loop
        scoreRef.current?.startTiming(bpm, 0, (data) => {
          if (!data) handleLoopEnd();
          else {
            activeIdxRef.current = data.index;
            userHitCurrentRef.current = false;
          }
        });
      }
    }
  }, [currentKeyIdx, currentLoop, keys, totalLoops, settings, bpm, metronome, useMetronomeOn, song, finishPractice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scoreRef.current?.stopTiming();
      metronome.stop();
      pitchDetector.stopListening();
      if (synthRef.current) synthRef.current.stop();
    };
  }, []);

  const playExample = async () => {
    if (isPlayingExample && synthRef.current) {
      synthRef.current.stop();
      setIsPlayingExample(false);
      return;
    }
    await Tone.start();
    if (!synthRef.current) {
      // Must use window.abcjs (or from import) audio context support
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

  const timeSignatureNum = parseInt(song?.timeSignature?.split('/')[0] || '4');

  // ── Render ─────────────────────────────────────
  return (
    <div className="practice-screen">
      {/* Header info */}
      <div className="practice-header">
        <button className="practice-back-btn" onClick={() => { metronome.stop(); pitchDetector.stopListening(); onExit?.(); }}>
          ‹ {t('common.back')}
        </button>
        <div className="practice-title">{song?.titleEn}</div>
        <div className="practice-key-badge">
          {t('practice.key')}: <strong>{currentKey}</strong>
        </div>
      </div>

      {/* Loop progress */}
      <div className="loop-indicator">
        {Array.from({ length: totalLoops }).map((_, i) => (
          <div
            key={i}
            className={`loop-dot ${i < currentLoop ? 'done' : i === currentLoop ? 'active' : ''}`}
          />
        ))}
        <span className="loop-label">
          {currentLoop + 1}/{totalLoops} {t('practice.loop')} · {currentKey}
        </span>
      </div>

      {/* Score area */}
      <div className="practice-score-area">
        <ScoreDisplay
          ref={scoreRef}
          abcString={abcString}
          showHints={activeNoteHint || activIntervalHint}
          hintType={activeNoteHint ? 'note' : activIntervalHint ? 'interval' : null}
          onNotesExtracted={(count) => { totalRef.current = noteListRef.current.length; }}
        />

        {/* Count-in overlay */}
        {isCountingIn && (
          <CountInOverlay beats={timeSignatureNum} currentBeat={countInBeat} onComplete={() => {}} />
        )}

        {/* Transposition banner */}
        {showTransitionBanner && (
          <div className="transposition-banner">
            <span>{t('practice.transposing')}</span>
            <span className="transition-key">{t('practice.newKey')}: {transitionNewKey}</span>
          </div>
        )}
      </div>

      {/* Bottom HUD */}
      <div className="practice-hud">
        {/* Metronome visual */}
        <MetronomeDisplay
          beat={metronome.beat}
          subBeat={metronome.subBeat}
          timeSignature={timeSignatureNum}
          isRunning={metronome.isRunning}
        />

        {/* Center: mic level + feedback */}
        <div className="hud-center">
          {/* Mic level bar */}
          <div className="mic-level-bar">
            <div className="mic-level-fill" style={{ height: `${pitchDetector.micLevel * 100}%` }} />
          </div>

          {/* Note feedback */}
          <div className={`note-feedback ${lastFeedback || ''}`}>
            {lastFeedback === 'correct' && <span>{t('practice.correct')}</span>}
            {lastFeedback === 'miss' && <span>{t('practice.miss')}</span>}
            {!lastFeedback && phase === 'playing' && (
              <span className="listening-text">🎙️</span>
            )}
          </div>
        </div>

        {/* Combo */}
        <ComboDisplay combo={combo} animationLevel={settings.animation} />
      </div>

      {/* Setup panel (before start) */}
      {phase === 'setup' && (
        <div className="setup-panel">
          <div className="setup-content">
            <h3>{song?.titleEn}</h3>
            <div className="setup-info">
              <span>Stage: <strong>{keyStage?.titleEn}</strong></span>
              <span>Keys: <strong>{keys.join(' → ')}</strong></span>
            </div>

            {/* BPM */}
            <div className="bpm-control">
              <label>BPM: <strong>{bpm}</strong></label>
              <input
                type="range"
                min="40" max="320" step="2"
                value={bpm}
                onChange={e => setBpm(Number(e.target.value))}
                className="bpm-slider"
              />
              <span className="bpm-range">40 — 320</span>
            </div>

            {/* Metronome toggle */}
            <div className="setup-toggle">
              <span>{t('master.metronome')}</span>
              <button
                className={`toggle-btn ${useMetronomeOn ? 'on' : ''}`}
                onClick={() => setUseMetronomeOn(v => !v)}
              >
                {useMetronomeOn ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Items */}
            <div className="setup-items">
              {state.inventory.noteHint > 0 && (
                <button
                  className={`item-btn ${activeNoteHint ? 'active' : ''}`}
                  onClick={() => setActiveNoteHint(v => !v)}
                >
                  🎵 {t('items.noteHint')} ({state.inventory.noteHint})
                </button>
              )}
              {state.inventory.intervalHint > 0 && (
                <button
                  className={`item-btn ${activIntervalHint ? 'active' : ''}`}
                  onClick={() => setActiveIntervalHint(v => !v)}
                >
                  🔢 {t('items.intervalHint')} ({state.inventory.intervalHint})
                </button>
              )}
              {state.inventory.slowStart > 0 && (
                <button
                  className={`item-btn ${activeSlowStart ? 'active' : ''}`}
                  onClick={() => setActiveSlowStart(v => !v)}
                >
                  🐢 {t('items.slowStart')} ({state.inventory.slowStart})
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button className="btn-secondary" onClick={playExample} style={{ flex: 1 }}>
                {isPlayingExample ? '⏹ 停止' : '🎧 お手本再生'}
              </button>
              <button className="btn-primary start-btn" onClick={handleStart} style={{ flex: 2 }}>
                ▶ {t('master.startPractice')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result panel */}
      {phase === 'result' && resultInfo && (
        <div className="result-overlay">
          <div className="result-panel">
            <div className={`result-badge ${resultInfo.passed ? 'passed' : 'failed'}`}>
              {resultInfo.passed ? '🎖️' : '😔'}
            </div>
            <h2>{resultInfo.passed ? (t('practice.titleEarned') || '称号獲得！') : 'Try Again!'}</h2>

            <div className="result-stats">
              <div className="result-stat">
                <span className="rs-label">{t('practice.accuracy')}</span>
                <span className="rs-value">{resultInfo.accuracy}%</span>
              </div>
              <div className="result-stat">
                <span className="rs-label">{t('practice.exp')}</span>
                <span className="rs-value">+{resultInfo.expGained}</span>
              </div>
              <div className="result-stat">
                <span className="rs-label">{t('practice.currency')}</span>
                <span className="rs-value">+{resultInfo.currencyGained} 💎</span>
              </div>
            </div>

            <div className="result-actions">
              <button className="btn-primary" onClick={() => {
                setPhase('setup');
                noteIdxRef.current = 0;
                comboRef.current = 0;
                setTotalCorrect(0);
                totalRef.current = 0;
                correctRef.current = 0;
                setCurrentLoop(0);
                setCurrentKeyIdx(0);
              }}>
                {t('practice.playAgain')}
              </button>
              <button className="btn-secondary" onClick={onExit}>
                {t('practice.backToMenu')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
