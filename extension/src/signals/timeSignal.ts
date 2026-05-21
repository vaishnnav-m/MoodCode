import type { MoodName, TimeBracket } from '@moodcode/shared';

export function getMoodFromTime(brackets: TimeBracket[]): MoodName {
	const hour = new Date().getHours();
	for (const bracket of brackets) {
		if (hour >= bracket.start && hour < bracket.end) {
			return bracket.mood;
		}
	}
	return 'deep_work';
}
