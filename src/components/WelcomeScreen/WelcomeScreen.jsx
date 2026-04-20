import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import './WelcomeScreen.css';

export default function WelcomeScreen() {
  const { dispatch } = useApp();
  const [selecting, setSelecting] = useState(false);

  const handleSelectLanguage = (lang) => {
    setSelecting(true);
    dispatch({ type: 'SET_LANGUAGE', language: lang });
    setTimeout(() => {
      dispatch({ type: 'SET_SCREEN', screen: 'calibration' });
    }, 400);
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-bg-grid" />
      <div className="welcome-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className={`welcome-content ${selecting ? 'fade-out' : ''}`}>
        {/* Logo / Title */}
        <div className="welcome-logo">
          <div className="welcome-logo-icon">♪</div>
          <div className="welcome-logo-text">
            <span className="logo-ja">ギター初見読譜トレーナー</span>
            <span className="logo-en">Guitar Sight-Reading Trainer</span>
          </div>
        </div>

        {/* Tag line */}
        <div className="welcome-tagline">
          <p className="tagline-ja">TAB譜から卒業して、Jazzスタンダードを初見で演奏しよう</p>
          <p className="tagline-en">Graduate from TAB sheets — read Jazz standards at first sight</p>
        </div>

        {/* Features */}
        <div className="welcome-features">
          <div className="feature-card">
            <span className="feature-icon">🎵</span>
            <span className="feature-ja">段階的な難易度設計</span>
            <span className="feature-en">Progressive Difficulty</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🎙️</span>
            <span className="feature-ja">マイク入力でリアルタイム判定</span>
            <span className="feature-en">Real-time Mic Detection</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🏆</span>
            <span className="feature-ja">称号システムで成長を可視化</span>
            <span className="feature-en">Gamified Title System</span>
          </div>
        </div>

        {/* Language selection */}
        <div className="welcome-language-select">
          <p className="language-prompt">言語を選択 / Select Language</p>
          <div className="language-buttons">
            <button
              className="lang-btn lang-btn-ja"
              onClick={() => handleSelectLanguage('ja')}
            >
              <span className="lang-flag">🇯🇵</span>
              日本語で始める
            </button>
            <button
              className="lang-btn lang-btn-en"
              onClick={() => handleSelectLanguage('en')}
            >
              <span className="lang-flag">🇺🇸</span>
              Start in English
            </button>
          </div>
        </div>

        {/* Recommended environment notice */}
        <div className="welcome-env-notice">
          <span className="env-icon">🖥️</span>
          <span>PC ＋ オーディオインターフェース ＋ ヘッドフォンでの使用を推奨 / Recommended: PC + Audio Interface + Headphones</span>
        </div>
      </div>
    </div>
  );
}
