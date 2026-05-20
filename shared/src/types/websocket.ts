import type { MoodName } from './mood.js';
import type { TimeBracket } from './config.js';

export type ServerMessage =
  | { type: 'config_update'; brackets: TimeBracket[] }
  | { type: 'pong' };

export type ClientMessage =
  | { type: 'register'; userId: string }
  | { type: 'log_mood'; mood: MoodName; theme: string }
  | { type: 'ping' };
