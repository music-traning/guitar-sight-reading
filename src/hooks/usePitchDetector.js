/**
 * usePitchDetector - Web Audio API based real-time pitch detection
 * Uses autocorrelation algorithm (YIN-inspired)
 */
import { useRef, useState, useCallback, useEffect } from 'react';

// Note frequencies for MIDI 0-127
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq) {
  if (freq <= 0) return null;
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export function midiToNoteName(midi) {
  if (midi == null) return null;
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { name, octave, full: `${name}${octave}` };
}

// Enharmonic equivalents
const ENHARMONIC = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
};

export function noteNamesMatch(a, b) {
  if (!a || !b) return false;
  const normA = a.trim().replace('b', '♭').replace('#', '♯');
  const normB = b.trim().replace('b', '♭').replace('#', '♯');
  if (normA === normB) return true;
  // Check enharmonic
  const enh = ENHARMONIC[a];
  if (enh && enh === b) return true;
  return false;
}

/**
 * Autocorrelation pitch detection
 */
function detectPitch(buffer, sampleRate) {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  
  // Calculate RMS to check if there's audio
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null; // Too quiet
  
  // Autocorrelation
  const correlations = new Float32Array(MAX_SAMPLES);
  for (let lag = 0; lag < MAX_SAMPLES; lag++) {
    let sum = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }
  
  // Find the peak after the first dip
  let d = 0;
  while (d < MAX_SAMPLES && correlations[d] > correlations[d + 1]) d++;
  
  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < MAX_SAMPLES; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i];
      maxPos = i;
    }
  }
  
  if (maxPos === -1 || maxPos < 2) return null;
  
  // Parabolic interpolation for more accurate peak
  const x1 = correlations[maxPos - 1];
  const x2 = correlations[maxPos];
  const x3 = correlations[maxPos + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a < 0) {
    maxPos = maxPos - b / (2 * a);
  }
  
  const freq = sampleRate / maxPos;
  if (freq < 60 || freq > 1400) return null; // Guitar range check
  
  return freq;
}

export default function usePitchDetector() {
  const [isListening, setIsListening] = useState(false);
  const [currentNote, setCurrentNote] = useState(null); // { name, octave, full, midi, freq }
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const bufferRef = useRef(null);
  const latencyOffsetRef = useRef(0);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      setAvailableDevices(inputs);
    } catch {
      // Ignore
    }
  }, []);

  const startListening = useCallback(async (deviceId = null, latencyMs = 0) => {
    latencyOffsetRef.current = latencyMs;
    
    try {
      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
      
      bufferRef.current = new Float32Array(analyser.fftSize);
      
      setIsListening(true);
      setError(null);
      
      // Start analysis loop
      const analyze = () => {
        analyser.getFloatTimeDomainData(bufferRef.current);
        
        // RMS for level meter
        let rms = 0;
        for (const v of bufferRef.current) rms += v * v;
        rms = Math.sqrt(rms / bufferRef.current.length);
        setMicLevel(Math.min(rms * 10, 1));
        
        const freq = detectPitch(bufferRef.current, ctx.sampleRate);
        if (freq) {
          const midi = freqToMidi(freq);
          const noteInfo = midiToNoteName(midi);
          if (noteInfo) {
            setCurrentNote({ ...noteInfo, midi, freq });
          }
        }
        
        animFrameRef.current = requestAnimationFrame(analyze);
      };
      analyze();
      
      await enumerateDevices();
    } catch (err) {
      setError(err.message || 'Microphone access failed');
      setIsListening(false);
    }
  }, [enumerateDevices]);

  const stopListening = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsListening(false);
    setCurrentNote(null);
    setMicLevel(0);
  }, []);

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  return {
    isListening,
    currentNote,
    micLevel,
    error,
    availableDevices,
    startListening,
    stopListening,
    enumerateDevices,
  };
}
