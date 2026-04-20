import { createContext, useContext, useReducer, useEffect } from 'react';
import jaStrings from '../i18n/ja.json';
import enStrings from '../i18n/en.json';

const STRINGS = { ja: jaStrings, en: enStrings };

// ─── Default State ───────────────────────────────
const DEFAULT_SETTINGS = {
  metronome: true,
  backbeatDisplay: true,
  backbeatOnly: false,
  clickSound: 'woodblock', // 'woodblock' | 'hihat' | 'cowbell'
  volume: 0.7,
  transpositionCountIn: true,
  animation: 'full', // 'full' | 'light' | 'off'
  micDeviceId: null,
};

const DEFAULT_USER_PROFILE = {
  level: 1,
  exp: 0,
  expToNext: 100,
  dex: 0,
  int: 0,
  agi: 0,
};

const DEFAULT_STATE = {
  // App flow
  screen: 'welcome', // welcome | calibration | placement | app
  activeTab: 'home',  // home | master | scale | titles | settings
  
  // User
  language: null, // 'ja' | 'en'
  userProfile: DEFAULT_USER_PROFILE,
  currency: 0,
  inventory: {
    noteHint: 0,
    intervalHint: 0,
    slowStart: 0,
    retryPass: 0,
    comboSave: 0,
    noteSkip: 0,
  },
  
  // Progress
  placementResult: null, // 'beginner' | 'intermediate' | 'advanced'
  progress: {}, // { songId_stage: { completed, score, accuracy, date } }
  titles: [],   // [{ id, songId, stage, earnedAt }]
  scaleProgress: {}, // { scaleId_key: true }
  scoreHistory: [],
  
  // Settings
  settings: DEFAULT_SETTINGS,
  latencyOffset: 0,
  
  // Streak
  streakData: { lastDate: null, current: 0, longest: 0 },
  
  // Manual flags (true = has been shown once)
  manualFlags: {},
};

// ─── LocalStorage helpers ─────────────────────────
const LS_KEY = 'guitar_srt_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    // Don't persist volatile fields
    const { ...persist } = state;
    localStorage.setItem(LS_KEY, JSON.stringify(persist));
  } catch {
    // Storage full or private mode
  }
}

// ─── Reducer ─────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, language: action.language };

    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };

    case 'SET_LATENCY':
      return { ...state, latencyOffset: action.ms };

    case 'SET_PLACEMENT':
      return { ...state, placementResult: action.level, screen: 'app' };

    case 'SKIP_PLACEMENT':
      return { ...state, placementResult: 'beginner', screen: 'app' };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'ADD_EXP': {
      const { amount } = action;
      let { exp, expToNext, level } = state.userProfile;
      exp += amount;
      while (exp >= expToNext) {
        exp -= expToNext;
        level += 1;
        expToNext = Math.floor(expToNext * 1.3);
      }
      return {
        ...state,
        userProfile: { ...state.userProfile, exp, expToNext, level },
      };
    }

    case 'ADD_CURRENCY':
      return { ...state, currency: state.currency + action.amount };

    case 'EARN_TITLE': {
      const key = `${action.songId}_${action.stage}`;
      if (state.titles.find(t => t.id === key)) return state;
      return {
        ...state,
        titles: [...state.titles, { id: key, songId: action.songId, stage: action.stage, earnedAt: Date.now() }],
      };
    }

    case 'SAVE_PROGRESS': {
      const key = `${action.songId}_${action.stage}`;
      return {
        ...state,
        progress: {
          ...state.progress,
          [key]: { completed: true, score: action.score, accuracy: action.accuracy, date: Date.now() },
        },
      };
    }

    case 'SAVE_SCALE_PROGRESS': {
      const key = `${action.scaleId}_${action.key}`;
      return {
        ...state,
        scaleProgress: { ...state.scaleProgress, [key]: true },
      };
    }

    case 'UPDATE_STREAK': {
      const today = new Date().toDateString();
      const { lastDate, current, longest } = state.streakData;
      if (lastDate === today) return state; // Already updated today
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newCurrent = lastDate === yesterday ? current + 1 : 1;
      return {
        ...state,
        streakData: { lastDate: today, current: newCurrent, longest: Math.max(longest, newCurrent) },
      };
    }

    case 'ADD_SCORE_HISTORY':
      return {
        ...state,
        scoreHistory: [action.entry, ...state.scoreHistory].slice(0, 50),
      };

    case 'USE_ITEM': {
      const { itemId } = action;
      if ((state.inventory[itemId] || 0) <= 0) return state;
      return {
        ...state,
        inventory: { ...state.inventory, [itemId]: state.inventory[itemId] - 1 },
      };
    }

    case 'BUY_ITEM': {
      const { itemId, cost } = action;
      if (state.currency < cost) return state;
      return {
        ...state,
        currency: state.currency - cost,
        inventory: { ...state.inventory, [itemId]: (state.inventory[itemId] || 0) + 1 },
      };
    }

    case 'SET_MANUAL_FLAG':
      return {
        ...state,
        manualFlags: { ...state.manualFlags, [action.key]: true },
      };

    case 'RESET_ALL':
      return { ...DEFAULT_STATE };

    case 'IMPORT_DATA':
      return { ...DEFAULT_STATE, ...action.data };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const saved = loadState();
  
  // Merge saved state with defaults (for new fields)
  const initialState = saved
    ? {
        ...DEFAULT_STATE,
        ...saved,
        settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) },
        userProfile: { ...DEFAULT_USER_PROFILE, ...(saved.userProfile || {}) },
        // If language is already set, skip welcome
        screen: saved.language ? 'app' : 'welcome',
      }
    : DEFAULT_STATE;

  const [state, dispatch] = useReducer(reducer, initialState);

  // Auto-save on state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // i18n helper
  const t = (path, fallback = '') => {
    const lang = state.language || 'ja';
    const strings = STRINGS[lang] || STRINGS.ja;
    const parts = path.split('.');
    let val = strings;
    for (const p of parts) {
      val = val?.[p];
      if (val === undefined) return fallback || path;
    }
    return val || fallback || path;
  };

  return (
    <AppContext.Provider value={{ state, dispatch, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function exportAllData(state) {
  return JSON.stringify(state, null, 2);
}

export function importAllData(jsonString) {
  return JSON.parse(jsonString);
}
