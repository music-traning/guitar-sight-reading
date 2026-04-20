import { useApp } from '../../context/AppContext';
import './AppShell.css';

const NAV_ITEMS = [
  { id: 'home',     iconJa: '🏠', iconEn: '🏠', keyJa: 'nav.home',     keyEn: 'nav.home' },
  { id: 'master',   iconJa: '🏯', iconEn: '🏯', keyJa: 'nav.masterMode', keyEn: 'nav.masterMode' },
  { id: 'scale',    iconJa: '🎼', iconEn: '🎼', keyJa: 'nav.scaleMode', keyEn: 'nav.scaleMode' },
  { id: 'titles',   iconJa: '🎖️', iconEn: '🎖️', keyJa: 'nav.titles',   keyEn: 'nav.titles' },
  { id: 'settings', iconJa: '⚙️', iconEn: '⚙️', keyJa: 'nav.settings', keyEn: 'nav.settings' },
];

export default function AppShell({ children }) {
  const { state, dispatch, t } = useApp();
  const { activeTab, userProfile, currency, streakData } = state;

  const setTab = (id) => dispatch({ type: 'SET_ACTIVE_TAB', tab: id });

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="app-header">
        <div className="header-logo">
          <span className="header-logo-icon">♪</span>
          <span className="header-title">{t('appName')}</span>
        </div>

        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-icon">⭐</span>
            <span>Lv.{userProfile.level}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-icon">🔥</span>
            <span>{streakData.current}{t('home.days')}</span>
          </div>
          <div className="stat-badge currency-badge">
            <span className="stat-icon">💎</span>
            <span>{currency.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="app-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <span className="nav-icon">{item.iconJa}</span>
            <span className="nav-label">{t(item.keyJa)}</span>
            {activeTab === item.id && <div className="nav-indicator" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
