import type { MoodName } from '../types/mood.js';

/** Default VS Code theme name per mood — out-of-box experience before user config. */
export const THEME_DEFAULTS: Record<MoodName, string> = {
  morning: 'GitHub Light',
  deep_work: 'Tokyo Night',
  post_lunch: 'One Dark Pro',
  late_night: 'Dracula',
};
