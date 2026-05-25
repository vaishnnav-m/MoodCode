/**
 * Typed payloads for non-time signals (Phase 2+). MVP uses time brackets only;
 * these shapes are stubs so extension/backend can share types when signals ship.
 */

/** Signals that feed the weighted mood engine (excludes manual `override`). */
export type SignalName = 'time' | 'spotify' | 'weather' | 'git' | 'typing';


/** MVP — current hour from the local clock. */
export interface TimeSignalPayload {
  hour: number;
}

/** Phase 2 — Spotify activity / audio features. */
export interface SpotifySignalPayload {
  energy: number;       // 0.0–1.0
  valence: number;      // 0.0–1.0 (positivity)
  tempo: number;        // BPM
  acousticness: number; // 0.0–1.0
  isPlaying: boolean;
}

/** Phase 2 — OpenWeatherMap snapshot. */
export interface WeatherSignalPayload {
  condition: 'clear' | 'cloudy' | 'rainy' | 'stormy';
  temperature: number;
}

/** Phase 2 — recent git activity in the workspace. */
export interface GitSignalPayload {
  commitFrequency: number;  // commits per hour
  revertRatio: number;      // 0.0–1.0
  fixCommitDensity: number; // ratio of fix: commits
  minutesSinceLastCommit: number;
}

/** Phase 4 — editor typing patterns. */
export interface TypingSignalPayload {
  wpm: number;
  backspaceRatio: number;
}

export type SignalPayload =
  | { signal: 'time'; data: TimeSignalPayload }
  | { signal: 'spotify'; data: SpotifySignalPayload }
  | { signal: 'weather'; data: WeatherSignalPayload }
  | { signal: 'git'; data: GitSignalPayload }
  | { signal: 'typing'; data: TypingSignalPayload };
