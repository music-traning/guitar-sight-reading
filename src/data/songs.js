/**
 * Song data for the Menkyo Kaiden (Master) Mode
 * All songs are written in C (base key) and transposed on demand.
 */

export const CIRCLE_OF_FIFTHS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];

export const KEY_STAGES = {
  single: { id: 'single', keys: ['C'], loops: 1, titleJa: '入門', titleEn: 'Intro' },
  shoden: { id: 'shoden', keys: ['C', 'F', 'Bb'], loops: 3, titleJa: '初伝', titleEn: 'Shoden' },
  chuden: { id: 'chuden', keys: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db'], loops: 6, titleJa: '中伝', titleEn: 'Chuden' },
  menkyo: { id: 'menkyo', keys: CIRCLE_OF_FIFTHS, loops: 12, titleJa: '免許皆伝', titleEn: 'Menkyo' },
};

export const ABC_KEYS = {
  'C': 'C', 'F': 'F', 'Bb': 'Bb', 'Eb': 'Eb', 'Ab': 'Ab', 'Db': 'Db',
  'Gb': 'Gb', 'B': 'B', 'E': 'E', 'A': 'A', 'D': 'D', 'G': 'G',
};

// ─────────────────────────────────────────────────
// TRANSPOSITION ENGINE
// ─────────────────────────────────────────────────
const KEY_SEMITONES = { 'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11 };
const LETTER_SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FLAT_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ROOT_SEMI = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};
const FLAT_KEY_NAMES = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

const KEY_NOTE_MAP = {
  'C': ['C', '^C', 'D', '_E', 'E', 'F', '^F', 'G', '_A', 'A', '_B', 'B'],
  'G': ['C', '^C', 'D', '_E', 'E', '=F', 'F', 'G', '^G', 'A', '_B', 'B'],
  'D': ['=C', 'C', 'D', '_E', 'E', '=F', 'F', 'G', '^G', 'A', '_B', 'B'],
  'A': ['=C', 'C', 'D', '_E', 'E', '=F', 'F', '=G', 'G', 'A', '_B', 'B'],
  'E': ['=C', 'C', '=D', 'D', 'E', '=F', 'F', '=G', 'G', 'A', '_B', 'B'],
  'B': ['=C', 'C', '=D', 'D', 'E', '=F', 'F', '=G', 'G', '=A', 'A', 'B'],
  'Gb': ['=C', 'D', '=D', 'E', '=E', 'F', 'G', '=G', 'A', '=A', 'B', 'C'],
  'F': ['C', '_D', 'D', '_E', 'E', 'F', '^F', 'G', '_A', 'A', 'B', '=B'],
  'Bb': ['C', '_D', 'D', 'E', '=E', 'F', '_G', 'G', '_A', 'A', 'B', '=B'],
  'Eb': ['C', '_D', 'D', 'E', '=E', 'F', '_G', 'G', 'A', '=A', 'B', '=B'],
  'Ab': ['C', 'D', '=D', 'E', '=E', 'F', '_G', 'G', 'A', '=A', 'B', '=B'],
  'Db': ['C', 'D', '=D', 'E', '=E', 'F', 'G', '=G', 'A', '=A', 'B', '=B'],
};

function transposeAbcBody(body, semitones, targetKey) {
  if (!semitones) return body;
  const noteMap = KEY_NOTE_MAP[targetKey] || KEY_NOTE_MAP['C'];
  const useFlats = FLAT_KEY_NAMES.has(targetKey);
  const ROOTS = useFlats ? FLAT_ROOTS : SHARP_ROOTS;

  const transposeRoot = (root) => {
    const s = ROOT_SEMI[root];
    if (s === undefined) return root;
    return ROOTS[(s + semitones + 120) % 12];
  };

  const chordStore = [];
  let result = body.replace(/"([^"]*)"/g, (_, chord) => {
    const transposed = chord.replace(/([A-G][b#]?)/g, root => transposeRoot(root));
    const idx = chordStore.length;
    chordStore.push(`"${transposed}"`);
    return `\x00${idx}\x00`;
  });

  result = result.replace(/([\^_]{1,2}|=)?([A-Ga-g])([,']*)([\d]*\/?[\d]*)/g,
    (match, acc, letter, octMod, dur) => {
      const isLower = letter >= 'a';
      const upper = letter.toUpperCase();
      let midi = LETTER_SEMI[upper] + (isLower ? 12 : 0);

      midi -= (octMod.match(/,/g) || []).length * 12;
      midi += (octMod.match(/'/g) || []).length * 12;

      if (acc === '^') midi += 1;
      if (acc === '^^') midi += 2;
      if (acc === '_') midi -= 1;
      if (acc === '__') midi -= 2;

      midi += semitones;
      const pc = ((midi % 12) + 12) % 12;
      const oct = Math.floor(midi / 12);
      const base = noteMap[pc];

      let noteName, octStr;
      if (oct >= 1) {
        noteName = base.replace(/[A-G]/, c => c.toLowerCase());
        octStr = "'".repeat(oct - 1);
      } else {
        noteName = base;
        octStr = ','.repeat(-oct);
      }
      return noteName + octStr + dur;
    }
  );

  result = result.replace(/\x00(\d+)\x00/g, (_, idx) => chordStore[+idx]);
  return result;
}

export const buildAbcString = (title, key, bpm, timeSignature, bodyInC) => {
  const abcKey = ABC_KEYS[key] || 'C';
  const semitones = KEY_SEMITONES[key] || 0;
  const body = semitones === 0 ? bodyInC : transposeAbcBody(bodyInC, semitones, key);
  return `X:1\nT:${title} (${key})\nM:${timeSignature}\nL:1/8\nQ:1/4=${bpm}\nK:${abcKey}\n${body}`;
};

// ─────────────────────────────────────────────────
// BEGINNER SONGS (計10曲)
// ─────────────────────────────────────────────────
export const BEGINNER_SONGS = [
  {
    id: 'saints', titleJa: '聖者の行進（風）', titleEn: 'When The Saints Go Marching In (Style)',
    difficulty: 'beginner', timeSignature: '4/4', recommendedBpm: 88, composer: 'Traditional',
    getAbc: (key, bpm) => buildAbcString('When The Saints...', key, bpm, '4/4',
      `z2 C2 E2 F2|"C"G8|z2 C2 E2 F2|"C"G8|\n` +
      `z2 C2 E2 F2|"C"G4 E4|C4 E4|"G7"D8|\n` +
      `z4 E4|"C"D2 C6|z4 A,4|"F"G,8|\n` +
      `z2 G2 G2 F2|"C"E4 G4|"G7"F4 D4|"C"C8|\n`)
  },
  {
    id: 'swinglow', titleJa: 'スイング・ロウ・スウィート・チャリオット（風）', titleEn: 'Swing Low, Sweet Chariot (Style)',
    difficulty: 'beginner', timeSignature: '4/4', recommendedBpm: 72, composer: 'Traditional Spiritual',
    getAbc: (key, bpm) => buildAbcString('Swing Low', key, bpm, '4/4',
      `z4 z2 G2|"C"E6 G2|E2 C2 C4|z4 A,2 C2|\n` +
      `"F"C4 A,2 G,2|"C"G,8|"G7"z4 z2 G2|"C"E6 G2|\n` +
      `E2 C2 C4|z4 E2 G2|"F"A4 G2 E2|"G7"G8|\n` +
      `"C"E6 G2|"F"E2 C2 C4|"G7"z4 A,2 C2|"C"C8|\n`)
  },
  {
    id: 'odetojoy', titleJa: '歓喜の歌（第九）（風）', titleEn: 'Ode to Joy (Style)',
    difficulty: 'beginner', timeSignature: '4/4', recommendedBpm: 80, composer: 'Ludwig van Beethoven',
    getAbc: (key, bpm) => buildAbcString('Ode to Joy', key, bpm, '4/4',
      `"C"E2 E2 F2 G2|G2 F2 E2 D2|"G7"C2 C2 D2 E2|E3 D D4|\n` +
      `"C"E2 E2 F2 G2|G2 F2 E2 D2|"G7"C2 C2 D2 E2|"C"D3 C C4|\n` +
      `"G7"D2 D2 E2 C2|D2 E2 F2 E2|"C"C2 D2 E2 D2|C4 z4|\n` +
      `"C"E2 E2 F2 G2|G2 F2 E2 D2|"G7"C2 C2 D2 E2|"C"D3 C C4|\n`)
  },
  {
    id: 'amazinggrace', titleJa: 'アメイジング・グレース（風）', titleEn: 'Amazing Grace (Style)',
    difficulty: 'beginner', timeSignature: '3/4', recommendedBpm: 66, composer: 'John Newton',
    getAbc: (key, bpm) => buildAbcString('Amazing Grace', key, bpm, '3/4',
      `z4 G,2|"C"C4 E2|C2 E4|"G7"D4 C2|\n` +
      `"C"E4 G2|G6|"F"z4 G2|"C"G4 E2|\n` +
      `C2 E4|D4 C2|"G7"A,4 G,2|G,4 G,2|\n` +
      `"C"C4 E2|C2 E4|"G7"D4 C2|"C"C6|\n`)
  },
  {
    id: 'godownmoses', titleJa: 'ゴー・ダウン・モーゼス（風）', titleEn: 'Go Down Moses (Style)',
    difficulty: 'beginner', timeSignature: '4/4', recommendedBpm: 76, composer: 'Traditional Spiritual',
    getAbc: (key, bpm) => buildAbcString('Go Down Moses', key, bpm, '4/4',
      `"Am"E4 G2 E2|A4 G4|"E7"E2 D2 C2 D2|"Am"E8|\n` +
      `E4 G2 E2|A4 G4|"E7"E2 D2 C2 B,2|"Am"A,8|\n` +
      `A4 A4|A2 G2 E4|E2 D2 C2 D2|E8|\n` +
      `E4 G2 E2|A4 G4|"E7"E2 D2 C2 B,2|"Am"A,8|\n`)
  },
  {
    id: 'osusanna', titleJa: 'おおスザンナ（風）', titleEn: 'Oh! Susanna (Style)',
    difficulty: 'beginner', timeSignature: '4/4', recommendedBpm: 100, composer: 'Stephen Foster',
    getAbc: (key, bpm) => buildAbcString('Oh Susanna', key, bpm, '4/4',
      `"C"C2 D2 E2 G2|G2 A2 G2 E2|C2 D2 E2 E2|"G7"D2 C2 D4|\n` +
      `"C"C2 D2 E2 G2|G2 A2 G2 E2|C2 D2 E2 E2|"G7"D2 D2 "C"C4|\n` +
      `"F"F4 F4|A2 A2 A4|"C"G2 G2 E2 C2|"G7"D8|\n` +
      `"C"C2 D2 E2 G2|G2 A2 G2 E2|C2 D2 E2 E2|"G7"D2 D2 "C"C4|\n`)
  },
  {
    id: 'auralee', titleJa: 'オーラ・リー（風）', titleEn: 'Aura Lee (Style)',
    difficulty: 'beginner', timeSignature: '4/4', recommendedBpm: 72, composer: 'George Poulton',
    getAbc: (key, bpm) => buildAbcString('Aura Lee', key, bpm, '4/4',
      `"C"G2 C2 B,2 C2|"A7"E2 A2 G2 F2|"Dm"E2 D2 E2 F2|"G7"A4 G4|\n` +
      `"C"G2 C2 B,2 C2|"A7"E2 A2 G2 F2|"Dm"E2 D2 "G7"E2 F2|"C"C8|\n` +
      `G4 G4|G2 F2 E2 F2|"F"A4 A4|A2 G2 F2 E2|\n` +
      `"C"G4 G4|"A7"A2 G2 F2 E2|"Dm"F2 G2 "G7"A2 B2|"C"c8|\n`)
  },
  {
    id: 'dannyboy', titleJa: 'ダニー・ボーイ（風）', titleEn: 'Danny Boy (Style)',
    difficulty: 'beginner', timeSignature: '4/4', recommendedBpm: 60, composer: 'Traditional Irish',
    getAbc: (key, bpm) => buildAbcString('Danny Boy', key, bpm, '4/4',
      `z4 E2 F2|"C"G3 A G2 E2|"F"C2 D2 E4|"C"z4 E2 F2|\n` +
      `G3 A c2 G2|"G7"F2 E2 D4|"C"z4 E2 F2|G3 A G2 E2|\n` +
      `"F"C2 D2 E4|"C"z4 c2 B2|"G7"A3 G E2 D2|"C"C8|\n` +
      `"F"z4 c2 B2|"C"A3 G E2 C2|"G7"D8|"C"z8|\n`)
  },
  {
    id: 'scarborough', titleJa: 'スカボロー・フェア（風）', titleEn: 'Scarborough Fair (Style)',
    difficulty: 'beginner', timeSignature: '3/4', recommendedBpm: 80, composer: 'Traditional English',
    getAbc: (key, bpm) => buildAbcString('Scarborough Fair', key, bpm, '3/4',
      `"Am"A,4 A,2|E4 E2|E2 F2 G2|E6|\n` +
      `"C"c4 c2|"G"d4 c2|"Am"B4 A2|A6|\n` +
      `A4 c2|"G"d4 d2|"Am"c4 A2|A6|\n` +
      `A2 G2 E2|"G"D4 C2|"Am"A,6|A,4 z2|\n`)
  },
  {
    id: 'greensleeves', titleJa: 'グリーンスリーブス（風）', titleEn: 'Greensleeves (Style)',
    difficulty: 'beginner', timeSignature: '3/4', recommendedBpm: 72, composer: 'Traditional English',
    getAbc: (key, bpm) => buildAbcString('Greensleeves', key, bpm, '3/4',
      `z4 A2|"Am"c4 d2|"C"e3 f e2|"G"d4 B2|\n` +
      `G3 A B2|"Am"c4 A2|A3 ^G A2|"E7"B4 ^G2|\n` +
      `"Am"E4 A2|c4 d2|"C"e3 f e2|"G"d4 B2|\n` +
      `G3 A B2|"Am"c3 B A2|"E7"^G3 ^F ^G2|"Am"A6|\n`)
  }
];

// ─────────────────────────────────────────────────
// INTERMEDIATE SONGS (計10曲)
// ─────────────────────────────────────────────────
export const INTERMEDIATE_SONGS = [
  {
    id: 'autumnleaves',
    titleJa: '枯葉（風）',
    titleEn: 'Autumn Leaves (Style)',
    difficulty: 'intermediate',
    timeSignature: '4/4',
    recommendedBpm: 100,
    composer: 'Joseph Kosma',
    getAbc: (key, bpm) => buildAbcString('Autumn Leaves', key, bpm, '4/4',
      // [A] The falling leaves, drift by the window...
      `z2 A2 B2 c2|"Dm7"f8|"G7"z2 G2 A2 B2|"Cmaj7"e8|` +
      `"Fmaj7"z2 F2 G2 A2|"Bm7b5"d8|"E7"z2 E2 ^F2 ^G2|"Am"A8|` +
      `z2 A2 B2 c2|"Dm7"f8|"G7"z2 G2 A2 B2|"Cmaj7"e8|` +
      `"Fmaj7"z2 F2 G2 A2|"Bm7b5"d8|"E7"z2 E2 ^F2 ^G2|"Am"A8|` +
      // [B] Since you went away, the days grow long...
      `"Bm7b5"e4 e4|"E7"d8|"Am"c4 c4|"Am"B8|` +
      `"Dm7"A4 A4|"G7"A6 G2|"Cmaj7"G8|"Fmaj7"z8|` +
      // [C] But I miss you most of all, my darling...
      `"Bm7b5"e2 e2 e2 e2|"E7"e2 d2 c2 d2|"Am"c8|"Fmaj7"z8|` +
      `"Bm7b5"z2 d2 c2 B2|"E7"A2 B2 ^G4|"Am"A8|z8|`
    )
  },
  {
    id: 'allofme',
    titleJa: 'オール・オブ・ミー（風）',
    titleEn: 'All of Me (Style)',
    difficulty: 'intermediate',
    timeSignature: '4/4',
    recommendedBpm: 110,
    composer: 'Simons/Marks',
    getAbc: (key, bpm) => buildAbcString('All of Me', key, bpm, '4/4',
      // [A1] All of me, why not take all of me...
      `"Cmaj7"c6 G2|"Cmaj7"c4 E4|"E7"B6 ^G2|"E7"B4 E4|` +
      `"A7"A6 G2|"A7"E2 F2 G2 A2|"Dm7"d8|"Dm7"A8|` +
      // [B] Take my lips, I want to lose them...
      `"E7"d6 c2|"E7"B2 c2 d2 c2|"Am7"c6 B2|"Am7"A2 B2 c2 A2|` +
      `"D7"e6 d2|"D7"^F2 G2 A2 B2|"Dm7"c8|"G7"B8|` +
      // [A2] Your goodbye left me with eyes that cry...
      `"Cmaj7"c6 G2|"Cmaj7"c4 E4|"E7"B6 ^G2|"E7"B4 E4|` +
      `"A7"A6 G2|"A7"E2 F2 G2 A2|"Dm7"d8|"Dm7"A8|` +
      // [C] You took the part that once was my heart...
      `"Fmaj7"d6 c2|"Fm6"_A2 c2 d2 c2|"Cmaj7"e6 c2|"A7"G2 A2 c2 e2|` +
      `"Dm7"d8|"G7"B8|"C6"c8|z8|`
    )
  },
  {
    id: 'bluebossa',
    titleJa: 'ブルー・ボッサ（風）',
    titleEn: 'Blue Bossa (Style)',
    difficulty: 'intermediate',
    timeSignature: '4/4',
    recommendedBpm: 120,
    composer: 'Kenny Dorham',
    getAbc: (key, bpm) => buildAbcString('Blue Bossa', key, bpm, '4/4',
      // [A1] Cm
      `"Cm"G2 F2 _E2 D2|"Cm"C8|"Cm"_E2 D2 C2 _B,2|"Cm"_A,8|` +
      `"Fm7"D2 C2 _B,2 _A,2|"Bb7"G,4 F,4|"Ebmaj7"G2 F2 _E2 D2|"Ebmaj7"C8|` +
      // [B] Ebm7 - Ab7 - Dbmaj7 (半音上のツーファイブワンへ転調)
      `"Ebm7"_d2 c2 _B2 _A2|"Ab7"_G8|"Dbmaj7"F2 _E2 _D2 C2|"Dbmaj7"_B,8|` +
      // [A2] Dm7b5 - G7 - Cm (元のキーへのツーファイブワン)
      `"Dm7b5"c2 B2 _A2 G2|"G7"F4 D4|"Cm"C8|z8|`
    )
  },
  {
    id: 'summertime', titleJa: 'サマータイム（風）', titleEn: 'Summertime (Style)',
    difficulty: 'intermediate', timeSignature: '4/4', recommendedBpm: 66, composer: 'George Gershwin',
    getAbc: (key, bpm) => buildAbcString('Summertime', key, bpm, '4/4',
      `"Am"E2 C2 E4|C8|E2 C2 E4|"E7"D8|\n` +
      `"Am"E2 C2 E4|C4 A,4|"Dm"D4 C2 A,2|"E7"C6 D2|\n` +
      `"Am"E2 C2 E4|C8|A2 G2 E2 C2|"Dm"D8|\n` +
      `"Am"E2 C2 E4|C4 A,4|"E7"A,8|"Am"z8|\n`)
  },
  {
    id: 'myfunnyvalentine', titleJa: 'マイ・ファニー・バレンタイン（風）', titleEn: 'My Funny Valentine (Style)',
    difficulty: 'intermediate', timeSignature: '4/4', recommendedBpm: 80, composer: 'Richard Rodgers',
    getAbc: (key, bpm) => buildAbcString('My Funny Valentine', key, bpm, '4/4',
      `"Cm"C2 D2 _E2 F2|G6 _E2|"Cm(maj7)"C2 D2 _E2 F2|G6 _E2|\n` +
      `"Cm7"C2 D2 _E2 F2|"Cm6"G4 _A4|"Abmaj7"_B8|z8|\n` +
      `"Fm7"c4 _B4|_A4 G4|"Dm7b5"F4 _E4|"G7"D8|\n` +
      `"Cm"C2 D2 _E2 F2|"Abmaj7"G6 F2|"Dm7b5"_E2 D2 C2 B,2|"G7"C8|\n`)
  },
  {
    id: 'misty', titleJa: 'ミスティ（風）', titleEn: 'Misty (Style)',
    difficulty: 'intermediate', timeSignature: '4/4', recommendedBpm: 88, composer: 'Erroll Garner',
    getAbc: (key, bpm) => buildAbcString('Misty', key, bpm, '4/4',
      `z4 B,2 C2|"Cmaj7"E4 G4|"Gm7"z4 "C7"_B2 A2|"Fmaj7"A4 F4|\n` +
      `"Fm7"z4 "Bb7"_A2 G2|"Cmaj7"G4 E4|"Am7"z4 C2 B,2|"Dm7"C4 A,4|\n` +
      `"G7"z4 B,2 C2|"Cmaj7"E4 G4|"Gm7"z4 "C7"_B2 A2|"Fmaj7"A4 F4|\n` +
      `"Fm7"z4 "Bb7"_A2 G2|"Cmaj7"G4 E4|"Dm7"z4 "G7"D2 C2|"Cmaj7"C8|\n`)
  },
  {
    id: 'takefive', titleJa: 'テイク・ファイブ（風）', titleEn: 'Take Five (Style)',
    difficulty: 'intermediate', timeSignature: '5/4', recommendedBpm: 168, composer: 'Paul Desmond',
    getAbc: (key, bpm) => buildAbcString('Take Five', key, bpm, '5/4',
      `"Dm"D2 F2 A2 d2 c2|"Am7"A6 z4|"Dm"D2 F2 A2 d2 c2|"Am7"A6 z4|\n` +
      `"Dm"D2 F2 A2 d2 c2|"Am7"A6 z4|"Dm"D2 F2 A2 d2 c2|"Am7"A6 z4|\n` +
      `"Fmaj7"f2 e2 d2 c2 B2|"Dm7"A4 B4 G2|"Em7"c4 d4 e2|"Am7"A10|\n` +
      `"Dm"D2 F2 A2 d2 c2|"Am7"A6 z4|"Dm"D2 F2 A2 d2 c2|"Am7"A6 z4|\n`)
  },
  {
    id: 'someday', titleJa: 'いつか王子様が（風）', titleEn: 'Someday My Prince Will Come (Style)',
    difficulty: 'intermediate', timeSignature: '3/4', recommendedBpm: 138, composer: 'Frank Churchill',
    getAbc: (key, bpm) => buildAbcString('Someday', key, bpm, '3/4',
      `z4 G2|"Cmaj7"E6|E4 F2|"E7"G4 c2|B4 A2|\n` +
      `"Fmaj7"F6|F4 G2|"Fm7"A4 d2|"Bb7"c4 _B2|\n` +
      `"Em7"C6|C4 D2|"A7"E4 A2|G4 F2|\n` +
      `"Dm7"A,6|A,4 B,2|"G7"C4 F2|E4 D2|\n`)
  },
  {
    id: 'saintlouisblues', titleJa: 'セントルイス・ブルース（風）', titleEn: 'St. Louis Blues (Style)',
    difficulty: 'intermediate', timeSignature: '4/4', recommendedBpm: 96, composer: 'W.C. Handy',
    getAbc: (key, bpm) => buildAbcString('St. Louis Blues', key, bpm, '4/4',
      `z4 z2 G2|"C7"c2 c2 _B2 G2|c4 C4|z8|\n` +
      `z4 z2 G2|"F7"c2 c2 _B2 G2|c4 C4|"C7"z8|\n` +
      `"G7"D8|c2 _B2 G4|"C7"F8|E4 z4|\n` +
      `c2 _B2 c2 G2|"F7"c2 _B2 G2 F2|"G7"D4 _B4|"C7"C8|\n`)
  },
  {
    id: 'waybeyondblue', titleJa: '酒とバラの日々（風）', titleEn: 'Days of Wine and Roses (Style)',
    difficulty: 'intermediate', timeSignature: '4/4', recommendedBpm: 88, composer: 'Henry Mancini',
    getAbc: (key, bpm) => buildAbcString('Days of Wine and Roses', key, bpm, '4/4',
      `"Fmaj7"F6 E2|D4 C4|"Eb7"B,6 A,2|G,8|\n` +
      `"Am7"C6 B,2|"D7"A,4 G,4|"Gm7"D6 C2|"C7"B,8|\n` +
      `"Fmaj7"F6 E2|D4 C4|"Eb7"B,6 A,2|G,8|\n` +
      `"Am7"C6 B,2|"D7"A,4 G,4|"Gm7"G4 A4|"C7"B8|\n`)
  }
];

// ─────────────────────────────────────────────────
// ADVANCED SONGS (計10曲)
// ─────────────────────────────────────────────────
export const ADVANCED_SONGS = [
  {
    id: 'confirmation', titleJa: 'コンファメーション（風）', titleEn: 'Confirmation (Style)',
    difficulty: 'advanced', timeSignature: '4/4', recommendedBpm: 200, composer: 'Charlie Parker',
    getAbc: (key, bpm) => buildAbcString('Confirmation', key, bpm, '4/4',
      `z2 C2 E2 G2|"Cmaj7"B2 A2 G2 F2|"Am7"E2 D2 "D7"C2 B,2|"Dm7"C2 D2 E2 F2|"G7"A2 G2 F2 E2|\n` +
      `"Cmaj7"D2 C2 B,2 A,2|"Fm7"G,2 C2 _E2 G2|"Em7"B2 A2 G2 F2|"A7"E2 A2 ^C2 E2|\n` +
      `"Dm7"G2 F2 E2 D2|"G7"C2 B,2 A,2 G,2|"Cmaj7"E8|z8|\n` +
      `"Gm7"f4 _e4|"C7"d4 c4|"Fmaj7"A8|z8|\n`)
  },
  {
    id: 'atriste', titleJa: 'A列車で行こう（風）', titleEn: 'Take The A Train (Style)',
    difficulty: 'advanced', timeSignature: '4/4', recommendedBpm: 192, composer: 'Billy Strayhorn',
    getAbc: (key, bpm) => buildAbcString('Take The A Train', key, bpm, '4/4',
      `z4 z2 G2|"C6"E8|z4 z2 G2|"D7#11"^F8|\n` +
      `z4 z2 A2|"Dm7"F8|"G7"z4 z2 D2|"C6"C8|z8|\n` +
      `z4 z2 G2|"C6"E8|z4 z2 G2|"D7#11"^F8|\n` +
      `z4 z2 A2|"Dm7"F8|"G7"z4 z2 D2|"C6"C8|z8|\n`)
  },
  {
    id: 'cherokee', titleJa: 'チェロキー（風）', titleEn: 'Cherokee (Style)',
    difficulty: 'advanced', timeSignature: '4/4', recommendedBpm: 260, composer: 'Ray Noble',
    getAbc: (key, bpm) => buildAbcString('Cherokee', key, bpm, '4/4',
      `"Cmaj7"G8|c4 d4|"Fm7"c8|"Bb7"_B4 _A4|\n` +
      `"Cmaj7"G8|C4 D4|"Dm7"E8|"G7"F4 G4|\n` +
      `"Dbm7"_A8|"Gb7"_d4 _e4|"Bmaj7"_d8|B4 _A4|\n` +
      `"Bm7"A8|"E7"d4 e4|"Amaj7"c8|A4 G4|\n`)
  },
  {
    id: 'howhigh', titleJa: 'ハウ・ハイ・ザ・ムーン（風）', titleEn: 'How High the Moon (Style)',
    difficulty: 'advanced', timeSignature: '4/4', recommendedBpm: 220, composer: 'Morgan Lewis',
    getAbc: (key, bpm) => buildAbcString('How High The Moon', key, bpm, '4/4',
      `z4 z2 G2|"Cmaj7"G2 E2 C4|z4 z2 G2|"Cm7"G2 _E2 C4|\n` +
      `z4 z2 F2|"F7"F2 D2 _B,4|z4 z2 F2|"Bbm7"F2 _D2 _B,4|\n` +
      `z4 z2 _E2|"Eb7"_E2 C2 _A,4|z8|"Am7"z8|\n` +
      `"D7"A4 ^F4|"Gmaj7"G4 D4|"Fm7"F4 C4|"Bb7"D8|\n`)
  },
  {
    id: 'impressions', titleJa: 'インプレッションズ（風）', titleEn: 'Impressions (Style)',
    difficulty: 'advanced', timeSignature: '4/4', recommendedBpm: 240, composer: 'John Coltrane',
    getAbc: (key, bpm) => buildAbcString('Impressions', key, bpm, '4/4',
      `"Dm7"D2 E2 F2 G2|A8|D2 E2 F2 G2|A8|\n` +
      `A2 B2 c2 d2|e8|D2 E2 F2 G2|A8|\n` +
      `"Ebm7"_E2 F2 _G2 _A2|_B8|_E2 F2 _G2 _A2|_B8|\n` +
      `"Dm7"D2 E2 F2 G2|A8|D2 E2 F2 G2|A8|\n`)
  },
  {
    id: 'waltzfordebby', titleJa: 'ワルツ・フォー・デビー（風）', titleEn: 'Waltz for Debby (Style)',
    difficulty: 'advanced', timeSignature: '3/4', recommendedBpm: 120, composer: 'Bill Evans',
    getAbc: (key, bpm) => buildAbcString('Waltz for Debby', key, bpm, '3/4',
      `"Cmaj7"E2 D2 C2|B,4 C2|"Dm7"G4 F2|"Em7"E4 D2|\n` +
      `"Fmaj7"C6|"Dm7"D4 E2|"G7"F4 G2|"Cmaj7"E6|\n` +
      `"Em7"B2 A2 G2|"A7"^F4 E2|"Dm7"D4 C2|"G7"B,4 A,2|\n` +
      `"Cmaj7"E2 D2 C2|"Dm7"G4 E2|"G7"D4 C2|"Cmaj7"B,6|\n`)
  },
  {
    id: 'giantsteps', titleJa: 'ジャイアント・ステップス（風）', titleEn: 'Giant Steps (Style)',
    difficulty: 'advanced', timeSignature: '4/4', recommendedBpm: 260, composer: 'John Coltrane',
    getAbc: (key, bpm) => buildAbcString('Giant Steps', key, bpm, '4/4',
      `"Cmaj7"G4 "Eb7"F2 _E2|"Abmaj7"C4 "B7"B,2 _B,2|"Emaj7"G,4 "Am7"A,2 C2|"D7"E4 "Gmaj7"G4|\n` +
      `"Cmaj7"G4 "Eb7"F2 _E2|"Abmaj7"C4 "B7"B,2 _B,2|"Emaj7"G,4 "Fm7"C2 _E2|"Bb7"F4 "Ebmaj7"_B4|\n` +
      `"Am7"c4 "D7"A2 G2|"Gmaj7"D4 "C#m7"E2 ^C2|"F#7"^A,4 "Bmaj7"B,2 D2|"Emaj7"^F4 "Fm7"c4|\n` +
      `"Bb7"_B4 "Ebmaj7"G2 F2|"Am7"C4 "D7"D2 C2|"Gmaj7"G,4 "C#m7"^G2 E2|"F#7"^C4 "Bmaj7"B,4|\n`)
  },
  {
    id: 'beautifullove', titleJa: 'ビューティフル・ラブ（風）', titleEn: 'Beautiful Love (Style)',
    difficulty: 'advanced', timeSignature: '4/4', recommendedBpm: 160, composer: 'Victor Young',
    getAbc: (key, bpm) => buildAbcString('Beautiful Love', key, bpm, '4/4',
      `"Em7b5"E6 ^C2|"A7"D6 E2|"Dm"F8|z8|\n` +
      `"Gm7"G6 E2|"C7"F6 G2|"Fmaj7"A8|z8|\n` +
      `"Em7b5"A6 G2|"A7"F6 E2|"Dm"F8|z8|\n` +
      `"Gm7"D6 C2|"C7"B,6 A,2|"Fmaj7"G,8|z8|\n`)
  },
  {
    id: 'invitation', titleJa: 'インビテーション（風）', titleEn: 'Invitation (Style)',
    difficulty: 'advanced', timeSignature: '4/4', recommendedBpm: 180, composer: 'Bronisław Kaper',
    getAbc: (key, bpm) => buildAbcString('Invitation', key, bpm, '4/4',
      `"Cm"c6 _B2|_A4 G4|"Fm7"F6 G2|"Bb7"_A4 _B4|\n` +
      `"Ebmaj7"G8|F4 _E4|"Dm7b5"D8|"G7"C4 D4|\n` +
      `"Cm"c6 _B2|_A4 G4|"Fm7"F6 G2|"Bb7"_A4 _B4|\n` +
      `"Ebmaj7"G8|F4 _E4|"Dm7b5"D8|"G7"C4 D4|\n`)
  },
  {
    id: 'wellouneednt', titleJa: 'ウェル・ユー・ニードント（風）', titleEn: "Well You Needn't (Style)",
    difficulty: 'advanced', timeSignature: '4/4', recommendedBpm: 216, composer: 'Thelonious Monk',
    getAbc: (key, bpm) => buildAbcString("Well You Needn't", key, bpm, '4/4',
      `"F7"F2 G2 F2 G2|"Gb7"F2 G2 F2 G2|"F7"F2 G2 F2 _E2|"Gb7"_D2 C2 _B,2 _A,2|\n` +
      `"F7"F2 G2 F2 G2|"Gb7"F2 G2 F2 G2|"F7"F2 G2 F2 _E2|"Gb7"_D2 C2 _B,2 _A,2|\n` +
      `"Db7"_D2 _E2 _D2 _E2|"D7"=D2 E2 =D2 E2|"Eb7"_E2 F2 _E2 F2|"E7"=E2 ^F2 =E2 ^F2|\n` +
      `"F7"F2 G2 F2 G2|"Gb7"F2 G2 F2 G2|"F7"F2 G2 F2 _E2|"Gb7"_D2 C2 _B,2 _A,2|\n`)
  }
];

export const ALL_SONGS = [...BEGINNER_SONGS, ...INTERMEDIATE_SONGS, ...ADVANCED_SONGS];
export const SONGS_BY_DIFFICULTY = {
  beginner: BEGINNER_SONGS,
  intermediate: INTERMEDIATE_SONGS,
  advanced: ADVANCED_SONGS,
};