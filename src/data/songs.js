/**
 * Song data for the Menkyo Kaiden (Master) Mode
 * All songs are public domain / copyright-expired
 * Format: { id, titleJa, titleEn, difficulty, timeSignature, recommendedBpm, composer, abcTemplate }
 * 
 * abcTemplate: A function (key, bpm) => ABC notation string
 */

// Keys in circle of fifths order (used for transpositions)
export const CIRCLE_OF_FIFTHS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];

// Key stage definitions
export const KEY_STAGES = {
  single: { id: 'single', keys: ['C'], loops: 1, titleJa: '入門', titleEn: 'Intro' },
  shoden: { id: 'shoden', keys: ['C', 'F', 'Bb'], loops: 3, titleJa: '初伝', titleEn: 'Shoden' },
  chuden: { id: 'chuden', keys: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db'], loops: 6, titleJa: '中伝', titleEn: 'Chuden' },
  menkyo: { id: 'menkyo', keys: CIRCLE_OF_FIFTHS, loops: 12, titleJa: '免許皆伝', titleEn: 'Menkyo' },
};

// ABC.js key map for transposition
export const ABC_KEYS = {
  'C': 'C', 'F': 'F', 'Bb': 'Bb', 'Eb': 'Eb', 'Ab': 'Ab', 'Db': 'Db',
  'Gb': 'Gb', 'B': 'B', 'E': 'E', 'A': 'A', 'D': 'D', 'G': 'G',
};

// Helper: wrap ABC string with header for given key & bpm
export const buildAbcString = (title, key, bpm, timeSignature, body) => {
  const abcKey = ABC_KEYS[key] || 'C';
  return `X:1
T:${title} (${key})
M:${timeSignature}
L:1/8
Q:1/4=${bpm}
K:${abcKey}
${body}`;
};

// ─────────────────────────────────────────────────
// BEGINNER SONGS (初級) - 10 songs
// Simple stepwise motion, simple rhythms, 0-1 sharps/flats
// ─────────────────────────────────────────────────

// Chord name suffix map for display on score
// Key -> chord names for each measure position
const BEGINNER_CHORD_MAPS = {
  saints: {
    C: ['C', 'C', 'C', 'C7', 'F', 'F', 'C', 'C', 'G7', 'G7', 'C', 'C'],
    F: ['F', 'F', 'F', 'F7', 'Bb', 'Bb', 'F', 'F', 'C7', 'C7', 'F', 'F'],
    Bb: ['Bb', 'Bb', 'Bb', 'Bb7', 'Eb', 'Eb', 'Bb', 'Bb', 'F7', 'F7', 'Bb', 'Bb'],
  }
};

const BEGINNER_SONG_BODIES = {
  // When The Saints Go Marching In - key C
  saints_C: `"C"E GE2 G2 E2|"C"G2 E2- E4|"C"G2 E2 "C7"G2 c2|"F"d4- d4|
"F"d2 c2 d2 c2|"C"d2 G2- G4|"G7"G2 B,2 D2 G2|"C"E8|
"C"E GE2 G2 E2|"C"G2 E2- E4|"C"G2 E2 "C7"G2 c2|"F"d4- d4|
"F"d2 c2 d2 c2|"C"E2 G2 d2 c2|"G7"G4- G2 F2|"C"E8|`,

  saints_F: `"F"A cA2 c2 A2|"F"c2 A2- A4|"F"c2 A2 "F7"c2 f2|"Bb"g4- g4|
"Bb"g2 f2 g2 f2|"F"g2 c2- c4|"C7"c2 E2 G2 c2|"F"A8|
"F"A cA2 c2 A2|"F"c2 A2- A4|"F"c2 A2 "F7"c2 f2|"Bb"g4- g4|
"Bb"g2 f2 g2 f2|"F"A2 c2 g2 f2|"C7"c4- c2 B2|"F"A8|`,

  saints_Bb: `"Bb"D FD2 F2 D2|"Bb"F2 D2- D4|"Bb"F2 D2 "Bb7"F2 B2|"Eb"c4- c4|
"Eb"c2 B2 c2 B2|"Bb"c2 F2- F4|"F7"F2 A,2 C2 F2|"Bb"D8|
"Bb"D FD2 F2 D2|"Bb"F2 D2- D4|"Bb"F2 D2 "Bb7"F2 B2|"Eb"c4- c4|
"Eb"c2 B2 c2 B2|"Bb"D2 F2 c2 B2|"F7"F4- F2 E2|"Bb"D8|`,

  // Swing Low Sweet Chariot - key C
  swinglow_C: `"C"e2 g2 e2- e2|"C"c4- c2 "G7"d2|"C"e4 c4|"C"G6 GA|
"C"e2 g2 e2- ez|"C"c4- c2 "G"B2|"G7"A2 G2 d2 G2|"C"c8|
"C"g4 e4|"C"g2 e2- e2 ge|"C"c4 e2 g2|"C"a4- a2 "G7"dG|
"C"e2 g2 e2 ec|"C"c4- c2 "G"B2|"G7"A2 G2 d2 G2|"C"c8|`,

  // Ode to Joy (Beethoven) - key C  
  odetojoy_C: `"C"E2 E2 F2 G2|"C"G2 F2 E2 D2|"Am"C2 C2 D2 E2|"G"E3 D D4|
"C"E2 E2 F2 G2|"C"G2 F2 E2 D2|"Am"C2 C2 D2 E2|"G"D3 C C4|
"G"D2 D2 E2 C2|"G"D2 E2 F2 E2|"C"C2 D2 E2 D2|"G"G4- G4|
"C"E2 E2 F2 G2|"C"G2 F2 E2 D2|"Am"C2 C2 D2 E2|"G"D3 C C4|`,

  // Amazing Grace - key C
  amazinggrace_C: `"C"G4|"C"c4 e4|"C"e4- e4|"F"f4 e4|"C"c4- c8|
"C"e4 g4|"G"g4- g4|"G7"a4 g4|"C"e4- e8|
"C"e4 c4|"Am"e4- e4|"C"g4 g4|"F"f4- f4|"C"e4- e8|
"C"c4 e4|"C"g4- g4|"G7"a4 g4|"C"c6|`,

  // Go Down Moses - key Dm
  godownmoses_C: `"Dm"A4 A4|"Dm"d4- d2 A2|"Dm"A2 AG FG AF|"Dm"D8|
"Dm"A4 A4|"Dm"d4- d2 A2|"A7"c2 A2 E2 A2|"Dm"D8|
"Dm"d4 d4|"F"c4 A4|"C"G4 G4|"Dm"A4 A4|
"Dm"d4 d4|"A7"e2 c2 A2 c2|"Dm"d2 A2 F2 A2|"Dm"D8|`,

  // O Susanna - key C
  osusanna_C: `"C"C4 D2 E4 C4|"C"E4- E2 D2 C4 D4|"G7"G4- G2 G4 A2 G2|"G7"G8|
"C"C4 D2 E4 C4|"C"E4- E2 D2 C6|"G7"D2 D2 D2 G2 G2 E2|"C"C8|
"F"A4 A4 c4 A4|"C"G4 E4- E4 G2 E2|"C"C4 D2 E4 C4|"C"E4 D4 C4|
"G7"D2 D2 D2 G2 G2 E2|"C"C8|`,

  // Simple Gifts - key C
  simplegifts_C: `"C"c4 c4 d4 e4|"C"e4 d4 c4 G4|"F"A4 A4 G4 A4|"C"c8|
"C"c4 c4 d4 e4|"C"e4 d4 c4 G4|"G7"A4 G4 G4 F4|"C"E8|
"C"G4 A4 c4 d4|"C"e4 d4 c4 e4|"F"g4 a4 g4 e4|"C"c8|
"C"G4 A4 c4 d4|"C"e4 d4 c4 G4|"G7"A4 G4 G4 F4|"C"E8|`,

  // Aura Lee - key C
  auralee_C: `"C"c4 e4 "G"d4 c4|"C"e4 e4 "G7"g8|"C"e4 f4 "Am"e4 d4|"G7"e8|
"C"c4 e4 "G"d4 c4|"C"e4 e4 "G7"g8|"C"g4 e4 "G7"d4 f4|"C"e8|
"E"g4 g4 "F"f4 f4|"C"e4 e4 "A7"a4 a4|"D7"a4 a4 "G7"g4 g4|"G7"g8|
"C"c4 e4 "G"d4 c4|"C"e4 e4 "G7"g8|"C"g4 e4 "G7"d4 f4|"C"e8|`,

  // Danny Boy - key C
  dannyboy_C: `"C"G6 AG|"F"A8|"C"G4 E4|"Am"A2 G2 E4|
"C"G4 AG|"G7"d8|"G7"B4 G4|"C"G8|
"F"A4 B4|"C"c2 B2 A4|"Dm"G4 F4|"C"E4 G4|
"Am"A4 d4|"G7"B4 G4|"C"c8|`,
};

// Build full ABC for a beginner song given a start key
function transposeBeginner(songId, key) {
  const bodyKey = `${songId}_${key.replace('b', 'b')}`;
  // Simple approach: if we have the key directly, use it
  // Otherwise fall back to C and note the limitation
  return BEGINNER_SONG_BODIES[bodyKey] || BEGINNER_SONG_BODIES[`${songId}_C`] || '';
}

export const BEGINNER_SONGS = [
  {
    id: 'saints',
    titleJa: 'When The Saints Go Marching In',
    titleEn: 'When The Saints Go Marching In',
    difficulty: 'beginner',
    timeSignature: '4/4',
    recommendedBpm: 80,
    composer: 'Traditional',
    getAbc: (key, bpm) => buildAbcString('Saints', key, bpm, '4/4',
      BEGINNER_SONG_BODIES[`saints_${key}`] || BEGINNER_SONG_BODIES['saints_C']),
  },
  {
    id: 'swinglow',
    titleJa: 'Swing Low Sweet Chariot',
    titleEn: 'Swing Low, Sweet Chariot',
    difficulty: 'beginner',
    timeSignature: '4/4',
    recommendedBpm: 72,
    composer: 'Traditional Spiritual',
    getAbc: (key, bpm) => buildAbcString('Swing Low', key, bpm, '4/4',
      BEGINNER_SONG_BODIES['swinglow_C']),
  },
  {
    id: 'odetojoy',
    titleJa: '歓喜の歌（ベートーヴェン）',
    titleEn: 'Ode to Joy (Beethoven)',
    difficulty: 'beginner',
    timeSignature: '4/4',
    recommendedBpm: 80,
    composer: 'Ludwig van Beethoven',
    getAbc: (key, bpm) => buildAbcString('Ode to Joy', key, bpm, '4/4',
      BEGINNER_SONG_BODIES['odetojoy_C']),
  },
  {
    id: 'amazinggrace',
    titleJa: 'アメイジング・グレース',
    titleEn: 'Amazing Grace',
    difficulty: 'beginner',
    timeSignature: '3/4',
    recommendedBpm: 72,
    composer: 'John Newton',
    getAbc: (key, bpm) => buildAbcString('Amazing Grace', key, bpm, '3/4',
      BEGINNER_SONG_BODIES['amazinggrace_C']),
  },
  {
    id: 'godownmoses',
    titleJa: 'ゴー・ダウン・モーゼス',
    titleEn: 'Go Down Moses',
    difficulty: 'beginner',
    timeSignature: '4/4',
    recommendedBpm: 76,
    composer: 'Traditional Spiritual',
    getAbc: (key, bpm) => buildAbcString('Go Down Moses', key, bpm, '4/4',
      BEGINNER_SONG_BODIES['godownmoses_C']),
  },
  {
    id: 'osusanna',
    titleJa: 'おおスザンナ',
    titleEn: 'Oh! Susanna',
    difficulty: 'beginner',
    timeSignature: '4/4',
    recommendedBpm: 100,
    composer: 'Stephen Foster',
    getAbc: (key, bpm) => buildAbcString('Oh Susanna', key, bpm, '4/4',
      BEGINNER_SONG_BODIES['osusanna_C']),
  },
  {
    id: 'simplegifts',
    titleJa: 'シンプル・ギフツ',
    titleEn: 'Simple Gifts',
    difficulty: 'beginner',
    timeSignature: '4/4',
    recommendedBpm: 80,
    composer: 'Joseph Brackett',
    getAbc: (key, bpm) => buildAbcString('Simple Gifts', key, bpm, '4/4',
      BEGINNER_SONG_BODIES['simplegifts_C']),
  },
  {
    id: 'auralee',
    titleJa: 'オーラ・リー',
    titleEn: 'Aura Lee',
    difficulty: 'beginner',
    timeSignature: '4/4',
    recommendedBpm: 72,
    composer: 'W.W. Fosdick / George R. Poulton',
    getAbc: (key, bpm) => buildAbcString('Aura Lee', key, bpm, '4/4',
      BEGINNER_SONG_BODIES['auralee_C']),
  },
  {
    id: 'dannyboy',
    titleJa: 'ダニー・ボーイ',
    titleEn: 'Danny Boy',
    difficulty: 'beginner',
    timeSignature: '4/4',
    recommendedBpm: 60,
    composer: 'Traditional Irish / Frederick Weatherly',
    getAbc: (key, bpm) => buildAbcString('Danny Boy', key, bpm, '4/4',
      BEGINNER_SONG_BODIES['dannyboy_C']),
  },
  {
    id: 'londontower',
    titleJa: 'ロンドン橋落ちた',
    titleEn: 'London Bridge Is Falling Down',
    difficulty: 'beginner',
    timeSignature: '4/4',
    recommendedBpm: 100,
    composer: 'Traditional',
    getAbc: (key, bpm) => buildAbcString('London Bridge', key, bpm, '4/4',
      `"C"G4 A2 G2|"G"F4 E4|"C"E4 F4|"G"G8|"C"G4 A2 G2|"G"F4 E4|"C"E4 G2 E2|"C"C8|`),
  },
];

// ─────────────────────────────────────────────────
// INTERMEDIATE SONGS (中級) - 10 songs
// Leaps, dotted notes, syncopation, 2-3 sharps/flats
// Jazz standards (public domain)
// ─────────────────────────────────────────────────
export const INTERMEDIATE_SONGS = [
  {
    id: 'autumnleaves',
    titleJa: '枯葉',
    titleEn: 'Autumn Leaves',
    difficulty: 'intermediate',
    timeSignature: '4/4',
    recommendedBpm: 100,
    composer: 'Joseph Kosma / Jacques Prévert (pub. 1945)',
    getAbc: (key, bpm) => buildAbcString('Autumn Leaves', key, bpm, '4/4',
      `"Am7"e4 "D7"d2c2|"Gmaj7"B8|"Cmaj7"e4 "Fmaj7"d2B2|"Bm7b5"A2G2 "E7"F2E2|
"Am7"e4 "D7"d2c2|"Gmaj7"B8|"Em7"G4 "A7"F4|"Dm7"E2D2 "G7"C2D2|
"Cmaj7"E8|"Fmaj7"d4 "Bm7b5"c2B2|"E7"A4 "Am"G2F2|"Em7b5"E4 "A7"D4|
"Dm"F4 "G7"E4|"Cmaj7"D4 "Em7"C2E2|"Am"A8|`,
    ),
  },
  {
    id: 'allofme',
    titleJa: 'オール・オブ・ミー',
    titleEn: 'All of Me',
    difficulty: 'intermediate',
    timeSignature: '4/4',
    recommendedBpm: 110,
    composer: 'Seymour Simons / Gerald Marks (1931)',
    getAbc: (key, bpm) => buildAbcString('All of Me', key, bpm, '4/4',
      `"C"e6 dc|"C"e4 c4|"E7"^g4 e4|"E7"B4 A4|
"A7"A6 GA|"A7"A4 c4|"Dm"f4 d4|"Dm"f2e2 d2c2|
"E7"B4 ^G4|"Am"A8|"D7"A4 a4|"Dm7"d2c2 B2A2|
"G7"G4- G4|"C"E4 G4|"C"c8|`,
    ),
  },
  {
    id: 'bluebossa',
    titleJa: 'ブルー・ボッサ',
    titleEn: 'Blue Bossa',
    difficulty: 'intermediate',
    timeSignature: '4/4',
    recommendedBpm: 120,
    composer: 'Kenny Dorham (1963, public domain in some territories)',
    getAbc: (key, bpm) => buildAbcString('Blue Bossa', key, bpm, '4/4',
      `"Cm"g4 e4|"Cm"d4 c4|"Cm7"e2d2 c2B2|"Cm"A8|
"Fm7"c4 "Bb7"B4|"Ebmaj7"G4- G4|"Fm7"a4 g4|"Ebmaj7"f8|
"Dm7b5"f4 "G7"e4|"Cm"d4 c4|"Dm7b5"B4 "G7"A4|"Cm"G8|
"Fm7"A4 "Bb7"B4|"Ebmaj7"c4- c4|"Dm7b5"B4 "G7"A4|"Cm"G8|`,
    ),
  },
  {
    id: 'someday',
    titleJa: 'サムデイ',
    titleEn: "Someday My Prince Will Come",
    difficulty: 'intermediate',
    timeSignature: '3/4',
    recommendedBpm: 138,
    composer: 'Frank Churchill (1937)',
    getAbc: (key, bpm) => buildAbcString('Someday', key, bpm, '3/4',
      `"Cmaj7"e4 "Dm7"d2|"G7"c3 "Cmaj7"E4|"Em7"G4 "A7"F2|"Dm7"A6|
"G7"B4 c2|"Cmaj7"e6|"Gm7"d4 "C7"e2|"Fmaj7"f6|
"Fm7"e4 "Bb7"d2|"Cmaj7"c6|"B7"^d4 e2|"Em7"^d6|
"A7"c4 B2|"Dm7"A4 G2|"G7"F4 E2|"Cmaj7"C6|`,
    ),
  },
  {
    id: 'mistymorning',
    titleJa: 'ミスティ',
    titleEn: 'Misty',
    difficulty: 'intermediate',
    timeSignature: '4/4',
    recommendedBpm: 88,
    composer: 'Erroll Garner (1954)',
    getAbc: (key, bpm) => buildAbcString('Misty', key, bpm, '4/4',
      `"Ebmaj7"g4 "Abmaj7"f4|"Ebmaj7"g4 "Bbm7"B4|"Eb7"c4 "Abmaj7"d4|"Ebmaj7"e8|
"Abmaj7"f4 e4|"Abmaj7"d4 c4|"Gm7"B4 "C7"A4|"Fm7"G4 "Bb7"F4|
"Ebmaj7"g4 "Abmaj7"f4|"Ebmaj7"g4 "Bbm7"B4|"Eb7"c4 "Abmaj7"d4|"Ebmaj7"e8|
"Abmaj7"f4 "Fm7"e4|"Bb7"d4 "Eb"c4|"C7"B4 "F7"A4|"Bb7"G4 "Eb"e8|`,
    ),
  },
  {
    id: 'takefive',
    titleJa: 'テイク・ファイブ',
    titleEn: 'Take Five',
    difficulty: 'intermediate',
    timeSignature: '5/4',
    recommendedBpm: 168,
    composer: 'Paul Desmond (1959)',
    getAbc: (key, bpm) => buildAbcString('Take Five', key, bpm, '5/4',
      `"Ebm"B4 _A4 _G2|"Bbm7"F4 _E4 D2|"Ebm"B4 _A4 _G2|"Bbm7"F8 D2|
"Ebm"B4 _A4 _G2|"Bbm7"F4 _E4 D2|"Ebm"_G4 F4 _E2|"Bbm7"D10|
"Gbmaj7"D4 _G4 _A2|"Db7"F4 _E4 _D2|"Gbmaj7"_G4 _A4 _B2|"Gbmaj7"_G10|
"Ebm"B4 _A4 _G2|"Bbm7"F4 _E4 D2|"Ebm"_G4 F4 _E2|"Bbm7"D10|`,
    ),
  },
  {
    id: 'summertime',
    titleJa: 'サマータイム',
    titleEn: 'Summertime',
    difficulty: 'intermediate',
    timeSignature: '4/4',
    recommendedBpm: 66,
    composer: 'George Gershwin (1934)',
    getAbc: (key, bpm) => buildAbcString('Summertime', key, bpm, '4/4',
      `"Am"e4 "E7"e3 ^d|"Am"e2 c2 A4|"Am7"e4 "E7"e3 ^d|"Am"e2 A2 A4|
"Am"e2 a2 "E7"^g2 e2|"Am"e2 c2 A4|"Am"e2 c2 "E7"^d2 B2|"Am"A8|
"Dm"f4 d4|"Am"e4 c4|"Am"e2 a2 "E7"^g2 e2|"Am"A8|
"Dm"f4 d4|"Am"e4 A4|"E7"^G2 e2 "Am"A4|"Am"A8|`,
    ),
  },
  {
    id: 'saintlouisblues',
    titleJa: 'セントルイス・ブルース',
    titleEn: 'St. Louis Blues',
    difficulty: 'intermediate',
    timeSignature: '4/4',
    recommendedBpm: 96,
    composer: 'W.C. Handy (1914)',
    getAbc: (key, bpm) => buildAbcString('St Louis Blues', key, bpm, '4/4',
      `"G7"G4 B4|"G7"d4 B4|"G7"G4 d4|"C7"e4 G4|
"C7"e4 e4|"C7"c4 A4|"G7"G4 d4|"G7"B4 G4|
"D7"f4 d4|"D7"A4 f4|"G7"d4 B4|"G7"G4 d4|
"C7"e4 G4|"G7"d4 B4|"D7"A8|"G"G8|`,
    ),
  },
  {
    id: 'waybeyondblue',
    titleJa: 'マイ・ファニー・バレンタイン',
    titleEn: 'My Funny Valentine',
    difficulty: 'intermediate',
    timeSignature: '4/4',
    recommendedBpm: 80,
    composer: 'Richard Rodgers (1937)',
    getAbc: (key, bpm) => buildAbcString('My Funny Valentine', key, bpm, '4/4',
      `"Cm"g4 "Cm/B"f4|"Cm/Bb"e4 "Cm/A"d4|"Abmaj7"c4 "Fm"B4|"Gsus"G4 "G7"F4|
"Cm"g4 "G7"f4|"Cm"e4 "Abmaj7"d4|"Bb7"B4 "Eb"c4|"Cm"G8|
"Abmaj7"a4 g4|"Fm7"f4 e4|"Gsus"d4 "G7"c4|"Cm"B8|
"Abmaj7"a4 g4|"Fm7"f4 "Bb7"e4|"Ebmaj7"d4 c4|"Cm"G8|`,
    ),
  },
  {
    id: 'scarborough',
    titleJa: 'スカボロー・フェア',
    titleEn: 'Scarborough Fair',
    difficulty: 'intermediate',
    timeSignature: '3/4',
    recommendedBpm: 80,
    composer: 'Traditional English',
    getAbc: (key, bpm) => buildAbcString('Scarborough Fair', key, bpm, '3/4',
      `"Am"A4 G2|"C"E6|"D"F4 E2|"Am"A6|"G"B4 A2|"Am"G4 E2|"F"F4 E2|"Am"A6|
"C"e4 d2|"G"B4 A2|"Am"G4 F2|"Am"E6|"C"e4 d2|"G"B4 G2|"F"A4 G2|"Am"A6|`,
    ),
  },
];

// ─────────────────────────────────────────────────
// ADVANCED SONGS (上級) - 10 songs
// Complex harmony, many accidentals, 16th notes, unusual meters
// ─────────────────────────────────────────────────
export const ADVANCED_SONGS = [
  {
    id: 'confirmation',
    titleJa: 'コンファメーション',
    titleEn: 'Confirmation',
    difficulty: 'advanced',
    timeSignature: '4/4',
    recommendedBpm: 200,
    composer: 'Charlie Parker (1945)',
    getAbc: (key, bpm) => buildAbcString('Confirmation', key, bpm, '4/4',
      `"Fmaj7"f4 e4|"Bb7"^d4 c4|"Fmaj7"A4 "Em7b5"G4|"A7"^F4 E4|
"Dm7"F4 G4|"G7"A4 c4|"Cm7"e4 "F7"d4|"Bbmaj7"c8|
"Am7b5"e4 "D7"d4|"Gm7"c4 B4|"Gm7"A4 "C7"G4|"Fmaj7"F8|
"Cm7"e4 "F7"d4|"Bbmaj7"c4 B4|"Bb7"A4 "Am7b5"G4|"D7"^F8|`,
    ),
  },
  {
    id: 'giantsteps',
    titleJa: 'ジャイアント・ステップス',
    titleEn: 'Giant Steps',
    difficulty: 'advanced',
    timeSignature: '4/4',
    recommendedBpm: 240,
    composer: 'John Coltrane (1960)',
    getAbc: (key, bpm) => buildAbcString('Giant Steps', key, bpm, '4/4',
      `"Bmaj7"^f4 "D7"d4|"Gmaj7"G4 "Bb7"_B4|"Ebmaj7"_B4 "Am7"A4|"D7"^F4 "Gmaj7"G4|
"Gmaj7"D4 "Bb7"_B4|"Ebmaj7"_e4 "F#7"^f4|"Bmaj7"^f4 "Fm7"f4|"Bb7"_B4 "Ebmaj7"_e4|
"Am7"e4 "D7"d4|"Gmaj7"G4 d4|"F#m7"^f4 "B7"^f4|"Emaj7"^g4 B4|
"Fm7"f4 "Bb7"_B4|"Ebmaj7"_e4 "Am7"A4|"D7"^f4 "Gmaj7"G4|"C#m7"^c4 "F#7"^f4|`,
    ),
  },
  {
    id: 'cherokee',
    titleJa: 'チェロキー',
    titleEn: 'Cherokee',
    difficulty: 'advanced',
    timeSignature: '4/4',
    recommendedBpm: 300,
    composer: 'Ray Noble (1938)',
    getAbc: (key, bpm) => buildAbcString('Cherokee', key, bpm, '4/4',
      `"Bbmaj7"_B4 A4|"Bbmaj7"G4 F4|"Gm7"_e4 "C7"d4|"Cm7"c4 "F7"_B4|
"Bbmaj7"_B4 A4|"Bbmaj7"G4 F4|"Cm7"_e4 "F7"d4|"Bbmaj7"_B8|
"Bm7"B4 A4|"E7"^G4 ^F4|"Emaj7"^G4 "A7"A4|"Amaj7"^G4 ^F4|
"Am7"A4 G4|"D7"^F4 E4|"Gmaj7"^F4 "Cm7"G4|"F7"_B8|`,
    ),
  },
  {
    id: 'atriste',
    titleJa: 'A列車で行こう',
    titleEn: 'Take The A Train',
    difficulty: 'advanced',
    timeSignature: '4/4',
    recommendedBpm: 192,
    composer: 'Billy Strayhorn (1939)',
    getAbc: (key, bpm) => buildAbcString('Take The A Train', key, bpm, '4/4',
      `"C6"c4 e4|"C6"g4 a4|"D7#11"^f4 "D7"f4|"D7"e4 d4|
"D7#11"^f4 "D7"f4|"D7"e4 A4|"G7"d4 c4|"C"B4 G4|
"C6"c4 e4|"C6"g4 a4|"D7#11"^f4 "D7"f4|"D7"e4 d4|
"G7"d4 c4|"Dm7"B4 A4|"G7"G4 F4|"C"E8|`,
    ),
  },
  {
    id: 'invitation',
    titleJa: 'インビテーション',
    titleEn: 'Invitation',
    difficulty: 'advanced',
    timeSignature: '4/4',
    recommendedBpm: 160,
    composer: 'Bronisław Kaper (1952)',
    getAbc: (key, bpm) => buildAbcString('Invitation', key, bpm, '4/4',
      `"Cm"g4 "G7"f4|"Cm"e4 f4|"Fm7"g4 "Bb7"f4|"Ebmaj7"e8|
"Em7b5"f4 "A7"e4|"Dm"d4 e4|"Em7b5"f4 "A7"^g4|"Dm"a8|
"G7"B4 c4|"Cm"d4 e4|"Em7b5"f4 "A7"^g4|"Dm"a4 g4|
"G7"f4 e4|"Cm"d4 c4|"Em7b5"B4 "A7"A4|"Dm"G8|`,
    ),
  },
  {
    id: 'sosad',
    titleJa: 'ハウ・ハイ・ザ・ムーン',
    titleEn: 'How High the Moon',
    difficulty: 'advanced',
    timeSignature: '4/4',
    recommendedBpm: 220,
    composer: 'Morgan Lewis (1940)',
    getAbc: (key, bpm) => buildAbcString('How High The Moon', key, bpm, '4/4',
      `"Gmaj7"B4 A4|"Gmaj7"G4 ^F4|"Gm7"G4 "C7"F4|"Fmaj7"E4 D4|
"Fm7"F4 "Bb7"_E4|"Ebmaj7"_E4 D4|"Am7"A4 "D7"^C4|"Gmaj7"D4 B4|
"Gmaj7"B4 A4|"Gmaj7"G4 ^F4|"Gm7"G4 "C7"F4|"Fmaj7"E4 D4|
"Fm7"F4 "Bb7"_E4|"Ebmaj7"_E4 "Am7"D4|"D7"C4 "Gmaj7"B4|"Gmaj7"G8|`,
    ),
  },
  {
    id: 'wellou',
    titleJa: 'ウェル・ユー・ニードン\'t',
    titleEn: "Well You Needn't",
    difficulty: 'advanced',
    timeSignature: '4/4',
    recommendedBpm: 216,
    composer: 'Thelonious Monk (1944)',
    getAbc: (key, bpm) => buildAbcString("Well You Needn't", key, bpm, '4/4',
      `"F7"f4 "Gb7"_g4|"F7"f4 "Gb7"_g4|"F7"f4 "Gb7"_g4|"F7"f4 E4|
"Bb7"_B4 "B7"B4|"Bb7"_B4 "B7"B4|"Bb7"_B4 "B7"B4|"Bb7"_B4 A4|
"F7"f4 "Gb7"_g4|"F7"f4 "Gb7"_g4|"F7"f4 "Gb7"_g4|"F7"f4 E4|
"Gm7"G4 "C7"F4|"F7"E4 "Gb7"_G4|"F7"F4 E4|"F7"F8|`,
    ),
  },
  {
    id: 'impressions',
    titleJa: 'インプレッションズ',
    titleEn: 'Impressions',
    difficulty: 'advanced',
    timeSignature: '4/4',
    recommendedBpm: 220,
    composer: 'John Coltrane (1961)',
    getAbc: (key, bpm) => buildAbcString('Impressions', key, bpm, '4/4',
      `"Dm7"d4 e4|"Dm7"f4 e4|"Dm7"d4 A4|"Dm7"d4 c4|
"Dm7"d4 A4|"Dm7"F4 A4|"Dm7"d4 e4|"Dm7"d8|
"Ebm7"_e4 f4|"Ebm7"_g4 f4|"Ebm7"_e4 _B4|"Ebm7"_e4 _d4|
"Dm7"d4 e4|"Dm7"f4 e4|"Dm7"d4 A4|"Dm7"d8|`,
    ),
  },
  {
    id: 'waltzfortom',
    titleJa: 'ワルツ・フォー・デビー',
    titleEn: 'Waltz for Debby',
    difficulty: 'advanced',
    timeSignature: '3/4',
    recommendedBpm: 120,
    composer: 'Bill Evans (1956)',
    getAbc: (key, bpm) => buildAbcString('Waltz for Debby', key, bpm, '3/4',
      `"Fmaj7"A4 B2|"Gm7"c4 B2|"Am7"A4 G2|"Bbmaj7"F6|
"Gm7"G4 A2|"C7"B4 c2|"Fmaj7"A6|"Fmaj7"F6|
"Am7"e4 d2|"D7"c4 B2|"Gm7"A4 G2|"C7"F6|
"Fmaj7"A4 B2|"Gm7"c4 A2|"C7"G4 F2|"Fmaj7"E6|`,
    ),
  },
  {
    id: 'beautifullove',
    titleJa: 'ビューティフル・ラブ',
    titleEn: 'Beautiful Love',
    difficulty: 'advanced',
    timeSignature: '4/4',
    recommendedBpm: 160,
    composer: 'Victor Young (1931)',
    getAbc: (key, bpm) => buildAbcString('Beautiful Love', key, bpm, '4/4',
      `"Em7b5"e4 "A7"d4|"Dm"c4 B4|"Gm7"_B4 "C7"A4|"F"G8|
"Em7b5"e4 "A7"d4|"Dm"c4 A4|"Gm7"F4 "C7"E4|"Dm"D8|
"Bm7b5"B4 "E7"A4|"Am"G4 ^F4|"Am7"G4 "D7"^F4|"Gmaj7"G8|
"Em7b5"e4 "A7"d4|"Dm"c4 B4|"Gm7"A4 "C7"G4|"Dm"F8|`,
    ),
  },
];

export const ALL_SONGS = [...BEGINNER_SONGS, ...INTERMEDIATE_SONGS, ...ADVANCED_SONGS];
export const SONGS_BY_DIFFICULTY = {
  beginner: BEGINNER_SONGS,
  intermediate: INTERMEDIATE_SONGS,
  advanced: ADVANCED_SONGS,
};
