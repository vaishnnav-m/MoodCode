import type { MoodName, TimeBracket } from '@moodcode/shared';

import { getMoodFromTime } from './signals/timeSignal.js';

export function getMood(brackets: TimeBracket[]): MoodName {
	return getMoodFromTime(brackets);
}
