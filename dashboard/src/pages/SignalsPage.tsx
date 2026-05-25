import { useState } from 'react';
import { useConfig } from '../hooks/useConfig';
import { useUserIdFromQuery } from '../hooks/useUserId';
import SignalToggle from '../components/SignalToggle';
import SpotifyConnect from '../components/SpotifyConnect';
import '../styles/dashboard-page.css';
import './SignalsPage.css';

export default function SignalsPage() {
  const userId = useUserIdFromQuery();
  const { config, setConfig, loading, saving, error, save } = useConfig(userId);
  const [spotifyConnected, setSpotifyConnected] = useState<boolean>(false);

  const handleWeightChange = (key: 'time' | 'typing' | 'spotify' | 'weather' | 'git') => (newWeight: number) => {
    setConfig((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        signalWeights: {
          ...prev.signalWeights,
          [key]: newWeight,
        },
      };
    });
  };

  const handleSave = async () => {
    try {
      await save();
    } catch {
      // error surfaced via hook state
    }
  };

  // Safe defaults
  const signalWeights = config?.signalWeights ?? {
    time: 100,
    typing: 0,
    spotify: 0,
    weather: 0,
    git: 0,
  };

  const { time, typing, spotify, weather, git } = signalWeights;
  const total = time + typing + spotify + weather + git;

  // Auto-normalize display values
  const normTime = total === 0 ? 100 : Math.round((time / total) * 100);
  const normTyping = total === 0 ? 0 : Math.round((typing / total) * 100);
  const normSpotify = total === 0 ? 0 : Math.round((spotify / total) * 100);
  const normWeather = total === 0 ? 0 : Math.round((weather / total) * 100);
  const normGit = total === 0 ? 0 : Math.round((git / total) * 100);

  return (
    <main className="dashboard-page signals-page">
      <h1>Signal weights</h1>
      <p className="subtitle">
        Configure how different environment signals are weighted to compute your active mood.
      </p>

      {!userId && (
        <p className="banner hint" role="status">
          Add <code>?userId=your-uuid</code> to the URL (same id as in the MoodCode extension).
        </p>
      )}

      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="status">Loading config…</p>}

      {config && !loading && (
        <>
          <SpotifyConnect userId={userId} onConnectionChange={setSpotifyConnected} />
          
          <div className="signals-layout">
            <section className="signals-list">
              <SignalToggle
                signalName="time"
                weight={time}
                onChange={handleWeightChange('time')}
              />
              <SignalToggle
                signalName="typing"
                weight={typing}
                onChange={handleWeightChange('typing')}
              />
              <SignalToggle
                signalName="spotify"
                weight={spotify}
                onChange={handleWeightChange('spotify')}
                disabled={!spotifyConnected}
              />
              <SignalToggle
                signalName="weather"
                weight={weather}
                onChange={handleWeightChange('weather')}
              />
              <SignalToggle
                signalName="git"
                weight={git}
                onChange={handleWeightChange('git')}
              />
            </section>

            <aside className="signals-summary-card">
              <h2>Effective weights</h2>
              <p className="summary-desc">
                All active weights are normalized to sum to 100% in the evaluation engine.
              </p>

              <div className="visualization-container">
                {total === 0 ? (
                  <div className="fallback-alert">
                    <span className="alert-icon" role="img" aria-label="warning">⚠️</span>
                    <p>
                      All weights are set to 0. The engine will default to <strong>100% Time of Day</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="bar-visualizer">
                    <div className="segments-bar">
                      {normTime > 0 && (
                        <div
                          className="segment segment-time"
                          style={{ width: `${normTime}%` }}
                          title={`Time of Day: ${normTime}%`}
                        />
                      )}
                      {normTyping > 0 && (
                        <div
                          className="segment segment-typing"
                          style={{ width: `${normTyping}%` }}
                          title={`Typing Activity: ${normTyping}%`}
                        />
                      )}
                      {normSpotify > 0 && (
                        <div
                          className="segment segment-spotify"
                          style={{ width: `${normSpotify}%` }}
                          title={`Spotify Activity: ${normSpotify}%`}
                        />
                      )}
                      {normWeather > 0 && (
                        <div
                          className="segment segment-weather"
                          style={{ width: `${normWeather}%` }}
                          title={`Local Weather: ${normWeather}%`}
                        />
                      )}
                      {normGit > 0 && (
                        <div
                          className="segment segment-git"
                          style={{ width: `${normGit}%` }}
                          title={`Git Behavior: ${normGit}%`}
                        />
                      )}
                    </div>
                    <ul className="breakdown-list">
                      <li className="breakdown-item time-item">
                        <span className="dot dot-time"></span>
                        <span className="label">Time of Day</span>
                        <span className="value">{normTime}%</span>
                      </li>
                      <li className="breakdown-item typing-item">
                        <span className="dot dot-typing"></span>
                        <span className="label">Typing Activity</span>
                        <span className="value">{normTyping}%</span>
                      </li>
                      <li className="breakdown-item spotify-item">
                        <span className="dot dot-spotify"></span>
                        <span className="label">Spotify Activity</span>
                        <span className="value">{normSpotify}%</span>
                      </li>
                      <li className="breakdown-item weather-item">
                        <span className="dot dot-weather"></span>
                        <span className="label">Local Weather</span>
                        <span className="value">{normWeather}%</span>
                      </li>
                      <li className="breakdown-item git-item">
                        <span className="dot dot-git"></span>
                        <span className="label">Git Behavior</span>
                        <span className="value">{normGit}%</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="actions">
                <button
                  type="button"
                  className="primary save-button"
                  disabled={saving || !userId}
                  onClick={() => void handleSave()}
                >
                  {saving ? 'Saving…' : 'Save weights'}
                </button>
              </div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
