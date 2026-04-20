import { useApp } from '../../context/AppContext';
import { SONGS_BY_DIFFICULTY, KEY_STAGES } from '../../data/songs';
import ManualAccordion from '../shared/ManualAccordion';
import './TitlesScreen.css';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const STAGES = ['single', 'shoden', 'chuden', 'menkyo'];

const STAGE_STARS = { single: 1, shoden: 2, chuden: 3, menkyo: 4 };

export default function TitlesScreen() {
  const { state, t } = useApp();
  const { titles, progress } = state;

  const hasTitle = (songId, stageId) => titles.some(ti => ti.id === `${songId}_${stageId}`);
  const isClear = (songId, stageId) => !!progress[`${songId}_${stageId}`]?.completed;

  const totalPossible = DIFFICULTIES.reduce((sum, d) => sum + SONGS_BY_DIFFICULTY[d].length * STAGES.length, 0);
  const earned = titles.length;

  // Grand master check
  const grandMasterDiffs = DIFFICULTIES.map(diff => {
    const songs = SONGS_BY_DIFFICULTY[diff];
    const lastStage = diff === 'beginner' ? 'shoden' : diff === 'intermediate' ? 'chuden' : 'menkyo';
    const needed = diff === 'beginner' ? 7 : diff === 'intermediate' ? 6 : 5;
    const cleared = songs.filter(s => isClear(s.id, lastStage)).length;
    return cleared >= needed;
  });
  const hasGrandMaster = grandMasterDiffs.every(Boolean);

  const diffColors = { beginner: '#4ade80', intermediate: '#fbbf24', advanced: '#f87171' };
  const diffLabels = {
    beginner: t('master.beginner'),
    intermediate: t('master.intermediate'),
    advanced: t('master.advanced'),
  };

  const stageNames = {
    single: t('titles.beginner'),
    shoden: t('titles.shoden'),
    chuden: t('titles.chuden'),
    menkyo: t('titles.menkyo'),
  };

  return (
    <div className="titles-screen">
      {/* Header */}
      <div className="titles-header">
        <h1>🎖️ {t('titles.title')}</h1>
        <div className="titles-progress">
          <div className="titles-progress-bar">
            <div className="titles-progress-fill" style={{ width: `${(earned / totalPossible) * 100}%` }} />
          </div>
          <span className="titles-count">{earned} / {totalPossible}</span>
        </div>
      </div>

      {/* Grand Master */}
      <div className={`grand-master-card ${hasGrandMaster ? 'unlocked' : ''}`}>
        <div className="gm-icon">{hasGrandMaster ? '👑' : '🔒'}</div>
        <div className="gm-info">
          <div className="gm-name">{t('titles.sogoMenkyo')}</div>
          <div className="gm-desc">
            {hasGrandMaster
              ? '全難易度の免許皆伝を達成！'
              : '全難易度で免許皆伝を取得すると解放'}
          </div>
        </div>
        <div className="gm-status">
          {grandMasterDiffs.map((done, i) => (
            <span key={i} className={`gm-dot ${done ? 'done' : ''}`} />
          ))}
        </div>
      </div>

      {/* Per-difficulty title grids */}
      {DIFFICULTIES.map(diff => {
        const songs = SONGS_BY_DIFFICULTY[diff];
        return (
          <div key={diff} className="diff-section">
            <h2 className="diff-section-title" style={{ color: diffColors[diff] }}>
              {diffLabels[diff]}
            </h2>
            <div className="titles-grid">
              {songs.map(song => (
                <div key={song.id} className="title-row">
                  <div className="title-song-name">{song.titleEn}</div>
                  <div className="title-stages">
                    {STAGES.map(stageId => {
                      const earned = hasTitle(song.id, stageId);
                      const cleared = isClear(song.id, stageId);
                      const stars = STAGE_STARS[stageId];
                      return (
                        <div
                          key={stageId}
                          className={`title-cell ${earned ? 'earned' : cleared ? 'cleared' : ''}`}
                          title={`${stageNames[stageId]}${earned ? ' 取得済み' : ''}`}
                        >
                          {earned ? (
                            <span className="title-cell-icon">🎖️</span>
                          ) : cleared ? (
                            <span className="title-cell-icon" style={{ opacity: 0.5 }}>✓</span>
                          ) : (
                            <span className="title-cell-lock">？</span>
                          )}
                          <span className="title-cell-label">{stageNames[stageId]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <ManualAccordion flagKey="titles" title={t('titles.manualTitle')} content={t('titles.manualContent')} />
    </div>
  );
}
