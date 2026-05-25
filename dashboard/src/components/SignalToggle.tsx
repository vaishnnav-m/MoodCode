import { useState } from 'react';
import './SignalToggle.css';

interface SignalToggleProps {
  signalName: string;
  weight: number;
  onChange: (weight: number) => void;
}

export default function SignalToggle({ signalName, weight, onChange }: SignalToggleProps) {
  const [prevWeight, setPrevWeight] = useState(weight > 0 ? weight : 50);
  const [prevPropWeight, setPrevPropWeight] = useState(weight);

  // Sync state with props during render without useEffect
  if (weight !== prevPropWeight) {
    setPrevPropWeight(weight);
    if (weight > 0) {
      setPrevWeight(weight);
    }
  }

  const isEnabled = weight > 0;

  const handleToggle = () => {
    if (isEnabled) {
      onChange(0);
    } else {
      onChange(prevWeight);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onChange(Number.isNaN(val) ? 0 : val);
  };

  const formatSignalName = (name: string): string => {
    switch (name) {
      case 'time':
        return 'Time of Day';
      case 'typing':
        return 'Typing Activity';
      case 'spotify':
        return 'Spotify Activity';
      case 'weather':
        return 'Local Weather';
      case 'git':
        return 'Git Behavior';
      default:
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
  };

  const getSignalDescription = (name: string): string => {
    switch (name) {
      case 'time':
        return 'Uses time of day and configured brackets.';
      case 'typing':
        return 'Tracks WPM, backspaces, and typing pauses.';
      case 'spotify':
        return 'Analyzes current tracks, tempo, and mood (Phase 3).';
      case 'weather':
        return 'Adapts to outside temperature and weather conditions (Phase 3).';
      case 'git':
        return 'Measures git commit frequency and revert ratio (Phase 3).';
      default:
        return 'Configure engine weight for this signal.';
    }
  };

  const isFutureSignal = ['spotify', 'weather', 'git'].includes(signalName);

  return (
    <div className={`signal-toggle-card ${isEnabled ? 'active' : ''} ${isFutureSignal ? 'future-signal' : ''}`}>
      <div className="signal-info">
        <div className="signal-header">
          <h3 className="signal-title">
            {formatSignalName(signalName)}
            {isFutureSignal && <span className="badge">Soon</span>}
          </h3>
          <label className="switch" aria-label={`Toggle ${formatSignalName(signalName)}`}>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggle}
              disabled={isFutureSignal}
            />
            <span className="switch-slider round"></span>
          </label>
        </div>
        <p className="signal-desc">{getSignalDescription(signalName)}</p>
      </div>

      <div className="signal-controls">
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={weight}
            onChange={handleSliderChange}
            disabled={!isEnabled || isFutureSignal}
            className="weight-slider"
            aria-label={`${formatSignalName(signalName)} weight slider`}
          />
          <div className="weight-display">
            <span className="weight-value">{weight}</span>
            <span className="weight-unit">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
