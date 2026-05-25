import type { MoodName } from './mood.js';
import type { TimeBracket, SignalWeights } from './config.js';
import type { SpotifySignalPayload, WeatherSignalPayload } from './signals.js';

export type ServerMessage =
  | {
      type: 'config_update';
      brackets: TimeBracket[];
      themeMappings: Record<MoodName, string>;
      signalWeights: SignalWeights;
    }
  | { type: 'spotify_update'; payload: SpotifySignalPayload }
  | { type: 'weather_update'; payload: WeatherSignalPayload }
  | { type: 'pong' };

export type ClientMessage =
  | { type: 'register'; userId: string }
  | { type: 'log_mood'; mood: MoodName; theme: string }
  | { type: 'ping' };
