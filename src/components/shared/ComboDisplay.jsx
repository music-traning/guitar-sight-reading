/**
 * ComboDisplay - Shows combo count with animations
 */
import { useEffect, useRef, useState } from 'react';
import './ComboDisplay.css';

const COMBO_TIERS = [
  { min: 50, label: 'LEGENDARY', multiplier: 3.0, currencyMult: 3.5, className: 'tier-legendary' },
  { min: 30, label: 'BLAZING',   multiplier: 2.5, currencyMult: 2.5, className: 'tier-blazing' },
  { min: 20, label: 'HOT',       multiplier: 2.0, currencyMult: 2.0, className: 'tier-hot' },
  { min: 10, label: 'COOL',      multiplier: 1.5, currencyMult: 1.5, className: 'tier-cool' },
  { min: 5,  label: 'GOOD',      multiplier: 1.2, currencyMult: 1.2, className: 'tier-good' },
  { min: 0,  label: '',          multiplier: 1.0, currencyMult: 1.0, className: 'tier-none' },
];

export function getComboTier(combo) {
  return COMBO_TIERS.find(t => combo >= t.min) || COMBO_TIERS[COMBO_TIERS.length - 1];
}

export default function ComboDisplay({ combo, animationLevel = 'full' }) {
  const prevComboRef = useRef(0);
  const [flash, setFlash] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const tier = getComboTier(combo);

  useEffect(() => {
    if (combo > prevComboRef.current && combo >= 5) {
      setFlash(true);
      setAnimKey(k => k + 1);
      setTimeout(() => setFlash(false), 600);
    }
    prevComboRef.current = combo;
  }, [combo]);

  if (combo === 0) return null;

  return (
    <div className={`combo-display ${tier.className} ${flash && animationLevel !== 'off' ? 'flash' : ''}`}>
      <div key={animKey} className={`combo-count ${flash ? 'combo-bump' : ''}`}>
        {combo}
      </div>
      <div className="combo-meta">
        <span className="combo-word">COMBO</span>
        <span className="combo-mult">×{tier.multiplier.toFixed(1)}</span>
      </div>
      {tier.label && animationLevel !== 'off' && (
        <div className={`combo-tier-label ${flash ? 'combo-tier-flash' : ''}`}>
          {tier.label}
        </div>
      )}
    </div>
  );
}
