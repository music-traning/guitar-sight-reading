/**
 * Scale data for Scale Practice Mode
 */

export const SCALES = [
  // 基礎 / Basics
  { id: 'major', nameJa: 'メジャースケール', nameEn: 'Major Scale', category: 'basic',
    formula: [0,2,4,5,7,9,11] },
  { id: 'natural_minor', nameJa: 'ナチュラルマイナー', nameEn: 'Natural Minor', category: 'basic',
    formula: [0,2,3,5,7,8,10] },
  
  // ペンタ系 / Pentatonic
  { id: 'major_pentatonic', nameJa: 'メジャーペンタトニック', nameEn: 'Major Pentatonic', category: 'pentatonic',
    formula: [0,2,4,7,9] },
  { id: 'minor_pentatonic', nameJa: 'マイナーペンタトニック', nameEn: 'Minor Pentatonic', category: 'pentatonic',
    formula: [0,3,5,7,10] },
  { id: 'blues', nameJa: 'ブルースペンタ（♭5追加）', nameEn: 'Blues Scale (b5)', category: 'pentatonic',
    formula: [0,3,5,6,7,10] },
  
  // モーダル / Modal
  { id: 'dorian', nameJa: 'ドリアン', nameEn: 'Dorian', category: 'modal',
    formula: [0,2,3,5,7,9,10] },
  { id: 'phrygian', nameJa: 'フリジアン', nameEn: 'Phrygian', category: 'modal',
    formula: [0,1,3,5,7,8,10] },
  { id: 'lydian', nameJa: 'リディアン', nameEn: 'Lydian', category: 'modal',
    formula: [0,2,4,6,7,9,11] },
  { id: 'mixolydian', nameJa: 'ミクソリディアン', nameEn: 'Mixolydian', category: 'modal',
    formula: [0,2,4,5,7,9,10] },
  { id: 'locrian', nameJa: 'ロクリアン', nameEn: 'Locrian', category: 'modal',
    formula: [0,1,3,5,6,8,10] },
  
  // 応用 / Advanced
  { id: 'harmonic_minor', nameJa: 'ハーモニックマイナー', nameEn: 'Harmonic Minor', category: 'advanced',
    formula: [0,2,3,5,7,8,11] },
  { id: 'melodic_minor', nameJa: 'メロディックマイナー', nameEn: 'Melodic Minor', category: 'advanced',
    formula: [0,2,3,5,7,9,11] },
];

export const ALL_KEYS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];

// MIDI note number for middle octave (4th octave) root of each key
export const KEY_MIDI_ROOT = {
  'C': 60, 'F': 65, 'Bb': 58, 'Eb': 63, 'Ab': 56, 'Db': 61,
  'Gb': 54, 'B': 59, 'E': 64, 'A': 57, 'D': 62, 'G': 67,
};

// ABC notation note names for each chromatic pitch relative to C
export const CHROMATIC_ABC_NOTES = ['C', '^C', 'D', '^D', 'E', 'F', '^F', 'G', '^G', 'A', '^A', 'B'];

/**
 * Generate ABC notation for a scale
 * @param {Object} scale - scale object
 * @param {string} key - root key name
 * @param {number} bpm - beats per minute
 * @param {number} octaves - 1 or 2
 * @param {'ascending'|'descending'|'both'} direction
 */
export function generateScaleAbc(scale, key, bpm, octaves = 1, direction = 'ascending') {
  const rootMidi = KEY_MIDI_ROOT[key] || 60;
  
  // Build ascending sequence of MIDI notes
  const ascending = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of scale.formula) {
      ascending.push(rootMidi + oct * 12 + interval);
    }
  }
  // Add top note
  ascending.push(rootMidi + octaves * 12);
  
  // Build descending
  const descending = [...ascending].reverse();
  
  let notes = [];
  if (direction === 'ascending') notes = ascending;
  else if (direction === 'descending') notes = descending;
  else notes = [...ascending, ...descending.slice(1)];
  
  // Convert MIDI to ABC
  const abcNotes = notes.map(midi => midiToAbc(midi));
  
  // Pad with rests to make it exactly fit into 4/4 measures (8 eighth notes per measure)
  const remainder = abcNotes.length % 8;
  if (remainder !== 0) {
    const padCount = 8 - remainder;
    for (let i = 0; i < padCount; i++) {
       abcNotes.push('z');
    }
  }

  // Group into measures
  let body = '';
  for (let i = 0; i < abcNotes.length; i += 8) {
    body += abcNotes.slice(i, i + 8).join(' ') + ' | ';
  }
  return `X:1
T:${scale.nameEn} - ${key}
M:4/4
L:1/8
Q:1/4=${bpm}
K:${key}
${body}`;
}

/**
 * Convert MIDI note number to ABC notation
 */
export function midiToAbc(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const pitch = midi % 12;
  const noteName = CHROMATIC_ABC_NOTES[pitch];
  
  // ABC octave convention: C4 = C (middle), C5 = c, C3 = C,
  if (octave === 4) return noteName; // middle octave: C D E F G A B
  if (octave === 5) return noteName.toLowerCase();
  if (octave === 6) return noteName.toLowerCase() + "'";
  if (octave === 3) return noteName + ',';
  if (octave === 2) return noteName + ',,';
  return noteName;
}
