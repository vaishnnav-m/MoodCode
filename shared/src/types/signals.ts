/**
 * Typed payloads for non-time signals (Phase 2+). MVP uses time brackets only;
 * these shapes are stubs so extension/backend can share types when signals ship.
 */

/** Signals that feed the weighted mood engine (excludes manual `override`). */
export type SignalName = 'time' | 'spotify' | 'weather' | 'git' | 'typing';

/** Per-signal weights for mood scoring (future dashboard SignalsPage). */
export type SignalWeights = Record<SignalName, number>;

/** MVP — current hour from the local clock. */
export interface TimeSignalPayload {
  hour: number;
}

/** Phase 2 — Spotify activity / audio features. */
export interface SpotifySignalPayload {
  isPlaying: boolean;
  tempo?: number;
  energy?: number;
  valence?: number;
}

/** Phase 2 — OpenWeatherMap snapshot. */
export interface WeatherSignalPayload {
  tempC: number;
  condition: string;
  isDay: boolean;
}

/** Phase 2 — recent git activity in the workspace. */
export interface GitSignalPayload {
  commitsLastHour: number;
  revertRatio: number;
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
