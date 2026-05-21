import type { MoodName, TimeBracket } from '@moodcode/shared';

import { getMoodFromTime } from './signals/timeSignal';

export function getMood(brackets: TimeBracket[]): MoodName {
	return getMoodFromTime(brackets);
}
