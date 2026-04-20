/**
 * useMetronome - Tone.js based metronome
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import * as Tone from 'tone';

export default function useMetronome() {
  const [isRunning, setIsRunning] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [beat, setBeat] = useState(0);      // 0-based beat index
  const [subBeat, setSubBeat] = useState(false); // true = on the "&"
  const [timeSignature, setTimeSignature] = useState(4);

  const loopRef = useRef(null);
  const synthAccentRef = useRef(null);
  const synthNormalRef = useRef(null);
  const synthSubRef = useRef(null);
  const settingsRef = useRef({ enabled: true, backbeatOnly: false, backbeatDisplay: true, volume: 0.7 });
  const beatCountRef = useRef(0);
  const onBeatRef = useRef(null); // callback(beat, isSubBeat)

  const initSynths = useCallback(() => {
    if (synthAccentRef.current) return;
    
    synthAccentRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -10,
    }).toDestination();

    synthNormalRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.08 },
      volume: -16,
    }).toDestination();

    synthSubRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      volume: -20,
    }).toDestination();
  }, []);

  const start = useCallback(async (options = {}) => {
    await Tone.start();
    initSynths();
    
    const {
      bpm: newBpm = bpm,
      timeSignature: newTs = timeSignature,
      enabled = true,
      backbeatOnly = false,
      volume = 0.7,
      onBeat = null,
    } = options;

    settingsRef.current = { enabled, backbeatOnly, volume };
    onBeatRef.current = onBeat;
    beatCountRef.current = 0;

    Tone.getTransport().bpm.value = newBpm;
    setBpm(newBpm);
    setTimeSignature(newTs);

    // Schedule at 8th note intervals for sub-beats
    const interval = '8n';
    
    loopRef.current = new Tone.Sequence(
      (time, step) => {
        const totalBeats = newTs * 2; // 8th note steps per bar
        const stepInBar = step % totalBeats;
        const beatIdx = Math.floor(stepInBar / 2);
        const isSubBeat = stepInBar % 2 === 1;

        // Visual update (schedule UI update slightly after audio)
        Tone.getDraw().schedule(() => {
          setBeat(beatIdx);
          setSubBeat(isSubBeat);
          if (onBeatRef.current) onBeatRef.current(beatIdx, isSubBeat);
        }, time);

        if (!settingsRef.current.enabled) return;

        const vol = settingsRef.current.volume;
        
        if (isSubBeat) {
          // Sub-beat (& sound)
          if (synthSubRef.current) {
            synthSubRef.current.volume.value = -20 + vol * 10;
            synthSubRef.current.triggerAttackRelease('G4', '32n', time);
          }
        } else {
          // Main beat
          if (settingsRef.current.backbeatOnly) return; // Skip main beats
          
          if (beatIdx === 0) {
            // Accent beat
            synthAccentRef.current?.triggerAttackRelease('C5', '32n', time);
          } else {
            synthNormalRef.current?.triggerAttackRelease('G4', '32n', time);
          }
        }
      },
      [...Array(newTs * 2).keys()],
      interval
    );

    loopRef.current.start(0);
    Tone.getTransport().start();
    setIsRunning(true);
  }, [bpm, timeSignature, initSynths]);

  const stop = useCallback(() => {
    Tone.getTransport().stop();
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current.dispose();
      loopRef.current = null;
    }
    setIsRunning(false);
    setBeat(0);
    setSubBeat(false);
  }, []);

  const updateSettings = useCallback((settings) => {
    settingsRef.current = { ...settingsRef.current, ...settings };
  }, []);

  // Count-in: play N beats then resolve promise
  const countIn = useCallback(async (beats, bpmVal, onCount) => {
    await Tone.start();
    initSynths();
    
    Tone.getTransport().bpm.value = bpmVal;
    
    return new Promise((resolve) => {
      let count = 0;
      const interval = Tone.Time('4n').toSeconds();
      
      const tick = () => {
        count++;
        if (onCount) onCount(count);
        
        // Play click
        const time = Tone.now();
        if (count === 1) {
          synthAccentRef.current?.triggerAttackRelease('C5', '32n', time);
        } else {
          synthNormalRef.current?.triggerAttackRelease('G4', '32n', time);
        }
        
        if (count < beats) {
          setTimeout(tick, interval * 1000);
        } else {
          setTimeout(resolve, interval * 1000);
        }
      };
      
      tick();
    });
  }, [initSynths]);

  useEffect(() => {
    return () => {
      stop();
      synthAccentRef.current?.dispose();
      synthNormalRef.current?.dispose();
      synthSubRef.current?.dispose();
    };
  }, [stop]);

  return {
    isRunning,
    bpm,
    beat,
    subBeat,
    timeSignature,
    start,
    stop,
    updateSettings,
    countIn,
  };
}
