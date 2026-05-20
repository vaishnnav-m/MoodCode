import type { MoodName } from './mood.js';

export interface TimeBracket {
  /** Hour 0–23 (inclusive start for normal ranges). */
  start: number;
  /** Hour 0–23 (exclusive end for normal ranges). */
  end: number;
  mood: MoodName;
  /** VS Code theme name, e.g. "GitHub Light". */
  theme: string;
}

/** Persisted user settings: time brackets + per-mood theme map (REST / MongoDB shape without ids). */
export interface UserConfig {
  brackets: TimeBracket[];
  themeMappings: Record<MoodName, string>;
}
