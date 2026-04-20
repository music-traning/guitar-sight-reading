import { useState, useEffect, useRef } from 'react';
import { useApp, exportAllData, importAllData } from '../../context/AppContext';
import usePitchDetector from '../../hooks/usePitchDetector';
import ManualAccordion from '../shared/ManualAccordion';
import './SettingsScreen.css';

export default function SettingsScreen() {
  const { state, dispatch, t } = useApp();
  const { settings, language, latencyOffset } = state;
  const [notification, setNotification] = useState(null);
  const [calibratingPhase, setCalibratingPhase] = useState(null); // null | 'measuring' | 'done'
  const [calibClickCount, setCalibClickCount] = useState(0);
  const [calibLog, setCalibLog] = useState([]);
  const clickTimeRef = useRef(null);
  const audioCtxRef = useRef(null);
  const { availableDevices, enumerateDevices } = usePitchDetector();
  const fileInputRef = useRef(null);

  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  const updateSetting = (key, value) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { [key]: value } });
  };

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ── Data management ──────────────────────────
  const handleExport = () => {
    const json = exportAllData(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guitar-srt-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(t('settings.exportSuccess'));
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = importAllData(ev.target.result);
        dispatch({ type: 'IMPORT_DATA', data });
        notify(t('settings.importSuccess'));
      } catch {
        notify(t('settings.importError'), 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    if (window.confirm(t('settings.resetConfirm'))) {
      dispatch({ type: 'RESET_ALL' });
      notify(t('settings.resetSuccess'));
    }
  };

  // ── Calibration ──────────────────────────────
  const playCalibClick = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  const startCalibration = () => {
    setCalibratingPhase('measuring');
    setCalibClickCount(0);
    setCalibLog([]);
    let count = 0;
    const run = () => {
      count++;
      setCalibClickCount(count);
      playCalibClick();
      clickTimeRef.current = performance.now();
      if (count < 5) setTimeout(run, 1000);
      else setTimeout(() => setCalibratingPhase('done'), 1000);
    };
    run();
  };

  const handleCalibTap = () => {
    if (calibratingPhase !== 'measuring' || !clickTimeRef.current) return;
    const delta = Math.round(performance.now() - clickTimeRef.current);
    setCalibLog(prev => [...prev, delta]);
  };

  const saveCalibration = () => {
    const validEntries = calibLog.filter(v => v > 0 && v < 1000);
    const avg = validEntries.length
      ? Math.round(validEntries.reduce((a, b) => a + b, 0) / validEntries.length)
      : 0;
    dispatch({ type: 'SET_LATENCY', ms: avg });
    setCalibratingPhase(null);
    notify(`レイテンシー ${avg}ms を保存しました`);
  };

  const Section = ({ title, children }) => (
    <div className="settings-section">
      <h2 className="settings-section-title">{title}</h2>
      <div className="settings-section-body">{children}</div>
    </div>
  );

  const Row = ({ label, children }) => (
    <div className="settings-row">
      <span className="settings-row-label">{label}</span>
      <div className="settings-row-control">{children}</div>
    </div>
  );

  const Toggle = ({ value, onChange, labelOn, labelOff }) => (
    <button
      className={`settings-toggle ${value ? 'on' : ''}`}
      onClick={() => onChange(!value)}
    >
      {value ? (labelOn || 'ON') : (labelOff || 'OFF')}
    </button>
  );

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <h1>⚙️ {t('settings.title')}</h1>
      </div>

      {notification && (
        <div className={`settings-notification ${notification.type}`}>
          {notification.msg}
        </div>
      )}

      {/* Language */}
      <Section title={t('settings.language')}>
        <Row label="">
          <div className="lang-selector">
            <button
              className={`lang-opt ${language === 'ja' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_LANGUAGE', language: 'ja' })}
            >
              🇯🇵 {t('settings.japanese')}
            </button>
            <button
              className={`lang-opt ${language === 'en' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_LANGUAGE', language: 'en' })}
            >
              🇺🇸 {t('settings.english')}
            </button>
          </div>
        </Row>
      </Section>

      {/* Metronome */}
      <Section title={t('settings.metronome')}>
        <Row label={t('settings.metronome')}>
          <Toggle value={settings.metronome} onChange={v => updateSetting('metronome', v)} />
        </Row>
        <Row label={t('settings.backbeatDisplay')}>
          <Toggle value={settings.backbeatDisplay} onChange={v => updateSetting('backbeatDisplay', v)} />
        </Row>
        <Row label={t('settings.backbeatOnly')}>
          <Toggle value={settings.backbeatOnly} onChange={v => updateSetting('backbeatOnly', v)} />
        </Row>
        <Row label={t('settings.volume')}>
          <input
            type="range" min="0" max="1" step="0.05"
            value={settings.volume}
            onChange={e => updateSetting('volume', Number(e.target.value))}
            className="settings-slider"
          />
          <span className="slider-value">{Math.round(settings.volume * 100)}%</span>
        </Row>
        <div className="settings-note">
          <span>ℹ️</span>
          <span>{t('metronome.backbeatOnlyDesc')}</span>
        </div>
      </Section>

      {/* Microphone */}
      <Section title={t('settings.microphone')}>
        <Row label={t('settings.micDevice')}>
          <select
            className="settings-select"
            value={settings.micDeviceId || ''}
            onChange={e => updateSetting('micDeviceId', e.target.value || null)}
          >
            <option value="">デフォルト / Default</option>
            {availableDevices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </Row>

        <Row label={t('settings.calibration')}>
          <div className="calib-control">
            <span className="calib-value">{latencyOffset}ms</span>
            <button className="btn-outline" onClick={startCalibration}>
              {t('settings.recalibrate')}
            </button>
          </div>
        </Row>

        {calibratingPhase && (
          <div className="calib-panel">
            {calibratingPhase === 'measuring' && (
              <>
                <p>クリック音に合わせてギターを弾いてください！</p>
                <div className="calib-progress">カウント: {calibClickCount} / 5</div>
                <button className="btn-primary tap-btn-small" onClick={handleCalibTap}>
                  🎸 TAP!
                </button>
                <div className="calib-log">
                  {calibLog.map((v, i) => <span key={i} className="calib-entry">{v}ms</span>)}
                </div>
              </>
            )}
            {calibratingPhase === 'done' && (
              <>
                <p>計測完了！</p>
                {calibLog.length > 0 && (
                  <p className="calib-avg">
                    平均: <strong>
                      {Math.round(calibLog.reduce((a, b) => a + b, 0) / calibLog.length)}ms
                    </strong>
                  </p>
                )}
                <div className="calib-done-btns">
                  <button className="btn-primary" onClick={saveCalibration}>保存</button>
                  <button className="btn-ghost" onClick={() => setCalibratingPhase(null)}>キャンセル</button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="settings-note">
          <span>💡</span>
          <span>{t('settings.calibrationNote')}</span>
        </div>
      </Section>

      {/* Transposition Count-in */}
      <Section title={t('settings.transpositionCountIn')}>
        <Row label="">
          <div className="radio-group">
            <label className={`radio-opt ${settings.transpositionCountIn ? 'active' : ''}`}>
              <input type="radio" checked={!!settings.transpositionCountIn} onChange={() => updateSetting('transpositionCountIn', true)} />
              {t('settings.transpositionCountInOn')}
            </label>
            <label className={`radio-opt ${!settings.transpositionCountIn ? 'active' : ''}`}>
              <input type="radio" checked={!settings.transpositionCountIn} onChange={() => updateSetting('transpositionCountIn', false)} />
              {t('settings.transpositionCountInOff')}
            </label>
          </div>
        </Row>
      </Section>

      {/* Animation */}
      <Section title={t('settings.animations')}>
        <Row label="">
          <div className="radio-group">
            {['full', 'light', 'off'].map(level => {
              const labels = { full: t('settings.animationFull'), light: t('settings.animationLight'), off: t('settings.animationOff') };
              return (
                <label key={level} className={`radio-opt ${settings.animation === level ? 'active' : ''}`}>
                  <input type="radio" checked={settings.animation === level} onChange={() => updateSetting('animation', level)} />
                  {labels[level]}
                </label>
              );
            })}
          </div>
        </Row>
      </Section>

      {/* Data management */}
      <Section title={t('settings.dataManagement')}>
        <div className="data-actions">
          <button className="btn-outline" onClick={handleExport}>
            📤 {t('settings.exportData')}
          </button>
          <button className="btn-outline" onClick={() => fileInputRef.current?.click()}>
            📥 {t('settings.importData')}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <button className="btn-danger" onClick={handleReset}>
            🗑️ {t('settings.resetData')}
          </button>
        </div>
      </Section>

      <ManualAccordion flagKey="settings" title={t('settings.manualTitle')} content={t('settings.manualContent')} />
    </div>
  );
}
