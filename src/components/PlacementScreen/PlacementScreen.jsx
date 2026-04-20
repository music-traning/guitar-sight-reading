import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import ScoreDisplay from '../ScoreDisplay/ScoreDisplay';
import usePitchDetector, { freqToMidi, midiToNoteName } from '../../hooks/usePitchDetector';
import './PlacementScreen.css';

// Simple placement test notes - 8 notes of increasing difficulty
const TEST_NOTES = [
  { abc: 'X:1\nT:Test\nM:4/4\nL:1/4\nK:C\nC4|', noteName: 'C', midi: 60 },
  { abc: 'X:1\nT:Test\nM:4/4\nL:1/4\nK:C\nE4|', noteName: 'E', midi: 64 },
  { abc: 'X:1\nT:Test\nM:4/4\nL:1/4\nK:C\nG4|', noteName: 'G', midi: 67 },
  { abc: 'X:1\nT:Test\nM:4/4\nL:1/4\nK:G\nD4|', noteName: 'D', midi: 62 },
  { abc: 'X:1\nT:Test\nM:4/4\nL:1/4\nK:F\nA4|', noteName: 'A', midi: 69 },
  { abc: 'X:1\nT:Test\nM:4/4\nL:1/4\nK:Bb\n_B4|', noteName: 'Bb', midi: 58 },
  { abc: 'X:1\nT:Test\nM:4/4\nL:1/4\nK:D\n^F4|', noteName: 'F#', midi: 66 },
  { abc: 'X:1\nT:Test\nM:4/4\nL:1/4\nK:Eb\n_E4|', noteName: 'Eb', midi: 63 },
];

const TOLERANCE_SEMITONES = 1;

function computeLevel(score, total) {
  const pct = score / total;
  if (pct >= 0.75) return 'advanced';
  if (pct >= 0.5) return 'intermediate';
  return 'beginner';
}

export default function PlacementScreen() {
  const { dispatch, t } = useApp();
  const [step, setStep] = useState('intro'); // intro | testing | done
  const [questionIdx, setQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [resultLevel, setResultLevel] = useState(null);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState(null);

  const { isListening, currentNote, startListening, stopListening, error: pitchError } = usePitchDetector();
  const detectedRef = useRef(false);
  const feedbackTimerRef = useRef(null);

  const startMic = async () => {
    try {
      await startListening(null, 0);
      setMicReady(true);
    } catch {
      setMicError(t('errors.micPermission'));
    }
  };

  const startTest = async () => {
    await startMic();
    setStep('testing');
    setQuestionIdx(0);
    setScore(0);
    detectedRef.current = false;
  };

  const skipTest = () => {
    stopListening();
    dispatch({ type: 'SKIP_PLACEMENT' });
  };

  // Check pitch against expected note
  useEffect(() => {
    if (step !== 'testing' || !currentNote || detectedRef.current) return;

    const expected = TEST_NOTES[questionIdx];
    const detectedMidi = currentNote.midi;
    const diff = Math.abs(detectedMidi - expected.midi);

    // Check within octave tolerance
    const matchInOctave = diff % 12 <= TOLERANCE_SEMITONES || diff % 12 >= (12 - TOLERANCE_SEMITONES);

    if (matchInOctave) {
      detectedRef.current = true;
      setFeedback('correct');
      setScore(s => s + 1);

      feedbackTimerRef.current = setTimeout(advanceQuestion, 900);
    }
  }, [currentNote, questionIdx, step]);

  const advanceQuestion = () => {
    setFeedback(null);
    detectedRef.current = false;

    if (questionIdx + 1 >= TEST_NOTES.length) {
      finishTest();
    } else {
      setQuestionIdx(i => i + 1);
    }
  };

  const skipQuestion = () => {
    clearTimeout(feedbackTimerRef.current);
    setFeedback('wrong');
    setTimeout(() => {
      setFeedback(null);
      detectedRef.current = false;
      if (questionIdx + 1 >= TEST_NOTES.length) {
        finishTest();
      } else {
        setQuestionIdx(i => i + 1);
      }
    }, 600);
  };

  const finishTest = () => {
    const level = computeLevel(score + (feedback === 'correct' ? 1 : 0), TEST_NOTES.length);
    setResultLevel(level);
    setStep('done');
    stopListening();
  };

  const confirmLevel = (level) => {
    dispatch({ type: 'SET_PLACEMENT', level });
  };

  const levelLabels = {
    beginner: t('placement.beginner'),
    intermediate: t('placement.intermediate'),
    advanced: t('placement.advanced'),
  };

  return (
    <div className="placement-screen">
      <div className="placement-card">
        <div className="placement-header">
          <div className="placement-icon">🎯</div>
          <h1>{t('placement.title')}</h1>
          <p>{t('placement.description')}</p>
        </div>

        {step === 'intro' && (
          <div className="placement-intro">
            <div className="placement-steps">
              <div className="step-item">
                <span className="step-num">1</span>
                <span>{t('language') === 'en' ? 'We show you a note on the staff' : '楽譜に音符が表示されます'}</span>
              </div>
              <div className="step-item">
                <span className="step-num">2</span>
                <span>{t('language') === 'en' ? 'Play that note on your guitar' : 'ギターでその音を弾いてください'}</span>
              </div>
              <div className="step-item">
                <span className="step-num">3</span>
                <span>{t('language') === 'en' ? 'Repeat for 8 notes total' : '合計8音を判定します'}</span>
              </div>
            </div>

            {micError && <p className="mic-error">⚠️ {micError}</p>}

            <div className="placement-actions">
              <button className="btn-primary" onClick={startTest}>
                {t('placement.startButton')}
              </button>
              <button className="btn-ghost" onClick={skipTest}>
                {t('placement.skip')}
              </button>
            </div>
          </div>
        )}

        {step === 'testing' && (
          <div className="placement-testing">
            <div className="question-progress">
              <span>{questionIdx + 1} / {TEST_NOTES.length}</span>
              <div className="progress-dots">
                {TEST_NOTES.map((_, i) => (
                  <div
                    key={i}
                    className={`dot ${i < questionIdx ? 'done' : i === questionIdx ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className="question-score-area">
              <ScoreDisplay
                abcString={TEST_NOTES[questionIdx].abc}
                currentNoteIndex={0}
              />
            </div>

            <div className={`feedback-display ${feedback || ''}`}>
              {feedback === 'correct' && <span>✓ {t('placement.correct')}</span>}
              {feedback === 'wrong' && <span>✗ {t('placement.incorrect')}</span>}
              {!feedback && isListening && <span className="listening-pulse">🎙️ {t('practice.listening')}</span>}
            </div>

            <p className="question-label">{t('placement.question')}: <strong>{TEST_NOTES[questionIdx].noteName}</strong></p>

            <button className="btn-ghost skip-btn" onClick={skipQuestion}>
              スキップ / Skip
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="placement-result">
            <div className="result-circle">
              <span className="result-score">{score}/{TEST_NOTES.length}</span>
            </div>
            <p className="result-label">{t('placement.recommendedLevel')}</p>
            <div className={`result-level level-${resultLevel}`}>
              {levelLabels[resultLevel]}
            </div>

            <div className="result-actions">
              <button className="btn-primary" onClick={() => confirmLevel(resultLevel)}>
                {t('placement.continueButton')}
              </button>
              <button className="btn-ghost" onClick={() => confirmLevel('beginner')}>
                {t('placement.skip')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
