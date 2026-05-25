import type { MoodName } from './mood.js';

export interface TimeBracket {
  start: number;
  end: number;
  mood: MoodName;
  theme: string;
}

export interface SignalWeights {
  time: number;      // 0–100
  typing: number;    // 0–100
  spotify: number;   // 0–100 (future)
  weather: number;   // 0–100 (future)
  git: number;       // 0–100 (future)
}

export interface UserConfig {
  brackets: TimeBracket[];
  themeMappings: Record<MoodName, string>;
  signalWeights: SignalWeights;
}