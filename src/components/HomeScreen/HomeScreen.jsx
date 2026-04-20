import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import ManualAccordion from '../shared/ManualAccordion';
import './HomeScreen.css';

const EXP_BAR_ID = 'exp-progress-bar';

export default function HomeScreen() {
  const { state, dispatch, t } = useApp();
  const { userProfile, currency, streakData, scoreHistory, progress, titles } = state;

  // Update streak on visit
  useEffect(() => {
    dispatch({ type: 'UPDATE_STREAK' });
  }, [dispatch]);

  const expPct = Math.round((userProfile.exp / userProfile.expToNext) * 100);
  const completedSongs = Object.keys(progress).filter(k => progress[k]?.completed).length;
  const totalTitles = titles.length;

  const recentScores = scoreHistory.slice(0, 5);

  const quickStart = () => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'master' });

  return (
    <div className="home-screen">
      {/* Hero stats */}
      <div className="home-hero">
        <div className="hero-level-ring">
          <svg viewBox="0 0 80 80" className="level-ring-svg">
            <defs>
              <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            <circle cx="40" cy="40" r="34" className="ring-bg" />
            <circle
              cx="40" cy="40" r="34"
              className="ring-fill"
              strokeDasharray={`${expPct * 2.138} 213.8`}
              strokeDashoffset="53.4"
            />
          </svg>
          <div className="level-ring-text">
            <span className="level-num">{userProfile.level}</span>
            <span className="level-lbl">LV</span>
          </div>
        </div>

        <div className="hero-info">
          <div className="hero-exp">
            <div className="exp-label">
              <span>EXP</span>
              <span>{userProfile.exp} / {userProfile.expToNext}</span>
            </div>
            <div className="exp-bar" role="progressbar" id={EXP_BAR_ID}>
              <div className="exp-fill" style={{ width: `${expPct}%` }} />
            </div>
          </div>

          <div className="hero-badges">
            <div className="hero-badge">
              <span className="badge-icon">🔥</span>
              <div className="badge-info">
                <span className="badge-value">{streakData.current}</span>
                <span className="badge-lbl">{t('home.streak')}</span>
              </div>
            </div>
            <div className="hero-badge">
              <span className="badge-icon">💎</span>
              <div className="badge-info">
                <span className="badge-value">{currency.toLocaleString()}</span>
                <span className="badge-lbl">{t('home.currency')}</span>
              </div>
            </div>
            <div className="hero-badge">
              <span className="badge-icon">🎖️</span>
              <div className="badge-info">
                <span className="badge-value">{totalTitles}</span>
                <span className="badge-lbl">{t('titles.title')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Streak alert */}
      {streakData.current > 0 && (
        <div className="streak-banner">
          <span>🔥</span>
          <span>
            {t('home.continueStreak')} <strong>{streakData.current}{t('home.days')}</strong>
            {streakData.longest > 0 && ` (最長: ${streakData.longest}日)`}
          </span>
        </div>
      )}

      {/* Quick Start */}
      <div className="home-section">
        <h2 className="section-title">{t('home.quickStart')}</h2>
        <button className="quick-start-btn" onClick={quickStart}>
          <div className="qs-icon">🏯</div>
          <div className="qs-info">
            <span className="qs-title">{t('nav.masterMode')}</span>
            <span className="qs-sub">{t('master.description')}</span>
          </div>
          <span className="qs-arrow">›</span>
        </button>
      </div>

      {/* Progress overview */}
      <div className="home-section">
        <h2 className="section-title">進捗 / Progress</h2>
        <div className="progress-cards">
          <div className="progress-card">
            <span className="pc-icon">🎵</span>
            <span className="pc-value">{completedSongs}</span>
            <span className="pc-label">クリア曲</span>
          </div>
          <div className="progress-card">
            <span className="pc-icon">🎖️</span>
            <span className="pc-value">{totalTitles}</span>
            <span className="pc-label">獲得称号</span>
          </div>
          <div className="progress-card">
            <span className="pc-icon">📅</span>
            <span className="pc-value">{streakData.longest}</span>
            <span className="pc-label">最長ストリーク</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="home-section">
        <h2 className="section-title">{t('home.recentActivity')}</h2>
        {recentScores.length === 0 ? (
          <div className="no-activity">{t('home.noActivity')}</div>
        ) : (
          <div className="activity-list">
            {recentScores.map((entry, i) => (
              <div key={i} className="activity-item">
                <span className="activity-song">{entry.songTitle || '—'}</span>
                <span className="activity-score">
                  ♦ {entry.score || 0} pts · {entry.accuracy || 0}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual */}
      <div className="home-section">
        <ManualAccordion flagKey="home" title={t('home.manualTitle')} content={t('home.manualContent')} />
      </div>
    </div>
  );
}
