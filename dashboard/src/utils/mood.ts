import type { MoodName } from '@moodcode/shared';

export const MOOD_NAMES: MoodName[] = ['morning', 'deep_work', 'post_lunch', 'late_night'];

export function formatMoodLabel(mood: MoodName): string {
  return mood
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
