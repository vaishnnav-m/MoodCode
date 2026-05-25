import { useEffect, useState } from 'react';
import { getSpotifyStatus, initiateSpotifyConnect, disconnectSpotify } from '../api/spotify';
import './SpotifyConnect.css';

interface SpotifyConnectProps {
  userId: string | undefined;
  onConnectionChange?: (connected: boolean) => void;
}

export default function SpotifyConnect({ userId, onConnectionChange }: SpotifyConnectProps) {
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;

    Promise.resolve().then(() => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
    });

    getSpotifyStatus(userId)
      .then((data) => {
        if (isMounted) {
          setConnected(data.connected);
          setLoading(false);
          if (onConnectionChange) {
            onConnectionChange(data.connected);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to get Spotify connection status:', err);
          setError('Failed to load Spotify connection status');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId, onConnectionChange]);

  const handleConnect = () => {
    if (!userId) {
      setError('Please add a valid userId to the URL to connect Spotify.');
      return;
    }
    initiateSpotifyConnect(userId);
  };

  const handleDisconnect = async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await disconnectSpotify(userId);
      setConnected(false);
      setLoading(false);
      if (onConnectionChange) {
        onConnectionChange(false);
      }
    } catch (err) {
      console.error('Failed to disconnect Spotify:', err);
      setError('Failed to disconnect Spotify account');
      setLoading(false);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="spotify-connect-card">
      <div className="spotify-connect-layout">
        <div className="spotify-branding-section">
          <div className="spotify-icon-wrapper">
            <svg
              className="spotify-svg-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.894-.982-.336.075-.668-.135-.744-.47-.076-.336.135-.668.47-.743 3.856-.88 7.15-.51 9.822 1.13.295.178.387.563.206.858zm1.225-2.72c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.076-1.182-.413.125-.848-.107-.973-.52-.125-.413.107-.847.52-.973 3.67-1.114 8.24-.57 11.344 1.34.367.227.487.708.26 1.075zm.106-2.833C14.492 8.76 8.707 8.57 5.37 9.583c-.512.155-1.045-.133-1.2-.646-.156-.513.132-1.046.645-1.2 3.82-1.16 10.22-.943 14.195 1.416.46.273.61.87.337 1.33-.274.46-.87.61-1.33.337z" />
            </svg>
          </div>
          <div className="spotify-text-details">
            <h3 className="spotify-connect-title">Spotify Integration</h3>
            <p className="spotify-connect-desc">
              Sync your real-time listening activity (tempo, energy, and valence) with the MoodCode engine to dynamically drive your editor themes.
            </p>
          </div>
        </div>

        <div className="spotify-action-section">
          {loading ? (
            <div className="spotify-loader-container">
              <div className="spotify-spinner"></div>
              <span className="spotify-loader-text">Processing…</span>
            </div>
          ) : error ? (
            <div className="spotify-error-container">
              <span className="spotify-error-icon" role="img" aria-label="error">⚠️</span>
              <span className="spotify-error-text">{error}</span>
            </div>
          ) : connected ? (
            <div className="spotify-status-badge connected">
              <div className="status-label-group">
                <div className="status-label">
                  <span className="status-dot-active"></span>
                  <span className="status-text">Connected</span>
                </div>
                <span className="status-subtext">Backend poller is running</span>
              </div>
              <button
                type="button"
                className="spotify-disconnect-btn"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="spotify-connect-btn"
              onClick={handleConnect}
            >
              Connect Spotify
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
