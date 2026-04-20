/**
 * ManualAccordion - Collapsible in-page manual/help section
 * Auto-expands on first visit (via manualFlags)
 */
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import './ManualAccordion.css';

export default function ManualAccordion({ flagKey, title, content }) {
  const { state, dispatch, t } = useApp();
  const hasBeenShown = state.manualFlags?.[flagKey];
  const [isOpen, setIsOpen] = useState(!hasBeenShown);

  useEffect(() => {
    if (!hasBeenShown) {
      dispatch({ type: 'SET_MANUAL_FLAG', key: flagKey });
    }
  }, [flagKey, hasBeenShown, dispatch]);

  const toggle = () => setIsOpen(v => !v);

  return (
    <div className={`manual-accordion ${isOpen ? 'open' : ''}`}>
      <button className="manual-toggle" onClick={toggle} aria-expanded={isOpen}>
        <span className="manual-toggle-icon">📖</span>
        <span className="manual-toggle-title">{title || t('common.manual')}</span>
        <span className="manual-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="manual-body">
          <p>{content}</p>
        </div>
      )}
    </div>
  );
}
