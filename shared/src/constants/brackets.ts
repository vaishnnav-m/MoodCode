import type { TimeBracket } from '../types/config.js';
import type { SignalWeights } from '../types/config.js';

/**
 * Default time brackets for offline / first-run. Order matters: post_lunch before
 * deep_work so 12–14 matches post_lunch first (overlaps 10–22).
 */
export const DEFAULT_BRACKETS: TimeBracket[] = [
  { start: 6, end: 10, mood: 'morning', theme: 'GitHub Light' },
  { start: 12, end: 14, mood: 'post_lunch', theme: 'One Dark Pro' },
  { start: 10, end: 22, mood: 'deep_work', theme: 'Tokyo Night' },
  { start: 22, end: 6, mood: 'late_night', theme: 'Dracula' },
];

export const DEFAULT_SIGNAL_WEIGHTS: SignalWeights = {
  time: 100,
  typing: 0,
  spotify: 0,
  weather: 0,
  git: 0,
};