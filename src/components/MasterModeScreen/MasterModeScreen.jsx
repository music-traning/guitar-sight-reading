import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SONGS_BY_DIFFICULTY, KEY_STAGES } from '../../data/songs';
import PracticeScreen from '../PracticeScreen/PracticeScreen';
import ManualAccordion from '../shared/ManualAccordion';
import './MasterModeScreen.css';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const STAGES = ['single', 'shoden', 'chuden', 'menkyo'];

export default function MasterModeScreen() {
  const { state, dispatch, t } = useApp();
  const [activeDifficulty, setActiveDifficulty] = useState('beginner');
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [inPractice, setInPractice] = useState(false);

  const songs = SONGS_BY_DIFFICULTY[activeDifficulty] || [];

  const getProgressKey = (songId, stageId) => `${songId}_${stageId}`;
  const isClear = (songId, stageId) => !!state.progress[getProgressKey(songId, stageId)]?.completed;
  const hasTitle = (songId, stageId) => state.titles.some(t => t.id === getProgressKey(songId, stageId));

  const difficultyLabels = {
    beginner: t('master.beginner'),
    intermediate: t('master.intermediate'),
    advanced: t('master.advanced'),
  };
  const difficultyColors = {
    beginner: '#4ade80',
    intermediate: '#fbbf24',
    advanced: '#f87171',
  };

  const handleStartPractice = () => {
    if (selectedSong && selectedStage) {
      setInPractice(true);
    }
  };

  const handleExitPractice = () => {
    setInPractice(false);
    setSelectedSong(null);
    setSelectedStage(null);
  };

  if (inPractice && selectedSong && selectedStage) {
    return (
      <PracticeScreen
        song={selectedSong}
        stageId={selectedStage}
        initialKey="C"
        onExit={handleExitPractice}
      />
    );
  }

  return (
    <div className="master-screen">
      <div className="master-header">
        <h1>🏯 {t('master.title')}</h1>
        <p>{t('master.description')}</p>
      </div>

      {/* Difficulty tabs */}
      <div className="difficulty-tabs">
        {DIFFICULTIES.map(diff => (
          <button
            key={diff}
            className={`diff-tab ${activeDifficulty === diff ? 'active' : ''}`}
            style={{ '--diff-color': difficultyColors[diff] }}
            onClick={() => { setActiveDifficulty(diff); setSelectedSong(null); setSelectedStage(null); }}
          >
            {difficultyLabels[diff]}
          </button>
        ))}
      </div>

      {!selectedSong ? (
        /* Song list */
        <div className="song-list">
          {songs.map(song => {
            const cleared = STAGES.filter(s => isClear(song.id, s)).length;
            return (
              <button
                key={song.id}
                className="song-card"
                onClick={() => setSelectedSong(song)}
              >
                <div className="song-card-main">
                  <div className="song-card-title">{song.titleEn}</div>
                  <div className="song-card-meta">
                    <span>♩={song.recommendedBpm}</span>
                    <span>{song.timeSignature}</span>
                    <span>{song.composer}</span>
                  </div>
                </div>
                <div className="song-card-right">
                  <div className="song-stars">
                    {STAGES.map((s, i) => (
                      <span key={s} className={`stage-star ${isClear(song.id, s) ? 'filled' : ''}`}>
                        {hasTitle(song.id, s) ? '🎖️' : isClear(song.id, s) ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                  <span className="song-cleared">{cleared}/4</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Stage selection */
        <div className="stage-select">
          <div className="stage-select-header">
            <button className="back-link" onClick={() => { setSelectedSong(null); setSelectedStage(null); }}>
              ‹ {t('common.back')}
            </button>
            <div className="stage-song-title">{selectedSong.titleEn}</div>
          </div>

          <div className="stage-list">
            {STAGES.map((stageId, i) => {
              const stage = KEY_STAGES[stageId];
              const cleared = isClear(selectedSong.id, stageId);
              const hasT = hasTitle(selectedSong.id, stageId);
              const isSelected = selectedStage === stageId;
              const stageNames = {
                single: t('master.singleKey'),
                shoden: t('master.threeKeys'),
                chuden: t('master.sixKeys'),
                menkyo: t('master.allKeys'),
              };
              return (
                <button
                  key={stageId}
                  className={`stage-card ${isSelected ? 'selected' : ''} ${cleared ? 'cleared' : ''}`}
                  onClick={() => setSelectedStage(isSelected ? null : stageId)}
                >
                  <div className="stage-card-left">
                    <div className="stage-num">{i + 1}</div>
                    <div className="stage-info">
                      <div className="stage-name">{stageNames[stageId]}</div>
                      <div className="stage-meta">
                        <span>{stage?.loops} {t('master.loops')}</span>
                        <span>·</span>
                        <span>{stage?.keys?.join(' → ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="stage-card-right">
                    {hasT && <span className="title-badge">🎖️</span>}
                    {cleared && !hasT && <span className="clear-check">✓</span>}
                    {isSelected && <span className="stage-arrow">›</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedStage && (
            <button className="btn-primary start-practice-btn" onClick={handleStartPractice}>
              ▶ {t('master.startPractice')}
            </button>
          )}
        </div>
      )}

      {/* Manual */}
      <div className="master-manual">
        <ManualAccordion flagKey="master" title={t('master.manualTitle')} content={t('master.manualContent')} />
      </div>
    </div>
  );
}
