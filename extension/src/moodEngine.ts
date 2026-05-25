import type { MoodName, SignalWeights, TimeBracket } from '@moodcode/shared';
import { DEFAULT_SIGNAL_WEIGHTS } from '@moodcode/shared';

export interface SignalScores {
	time?: MoodName;
	typing?: MoodName;
	spotify?: MoodName;   // future
	weather?: MoodName;   // future
	git?: MoodName;       // future
}

// Convert MoodName to a numeric score for weighted averaging
const MOOD_SCORES: Record<MoodName, number> = {
	morning: 0,
	post_lunch: 1,
	deep_work: 2,
	late_night: 3,
};

// Convert numeric score back to MoodName
function scoreToMood(score: number): MoodName {
	const rounded = Math.round(score);
	const moods = Object.entries(MOOD_SCORES) as [MoodName, number][];
	const match = moods.find(([, s]) => s === rounded);
	return match?.[0] ?? 'deep_work';
}

function normalizeWeights(weights: SignalWeights): SignalWeights {
	const total = weights.time + weights.typing + weights.spotify + weights.weather + weights.git;
	if (total === 0) {
		return { ...weights };
	}
	return {
		time: weights.time / total,
		typing: weights.typing / total,
		spotify: weights.spotify / total,
		weather: weights.weather / total,
		git: weights.git / total,
	};
}

export function getMood(
	brackets: TimeBracket[],
	weights: SignalWeights = DEFAULT_SIGNAL_WEIGHTS,
	signals: SignalScores = {},
): MoodName {
	const normalized = normalizeWeights(weights);
	let weightedScore = 0;
	let totalWeight = 0;

	// Check each signal that has a score and a weight > 0
	const signalNames: (keyof SignalWeights & keyof SignalScores)[] = [
		'time',
		'typing',
		'spotify',
		'weather',
		'git',
	];

	for (const key of signalNames) {
		const score = signals[key];
		const weight = normalized[key];
		if (score !== undefined && weight > 0) {
			weightedScore += MOOD_SCORES[score] * weight;
			totalWeight += weight;
		}
	}

	// Fallback to time signal if no signals have a score and weight > 0
	if (totalWeight === 0) {
		return getTimeSignalMood(brackets);
	}

	return scoreToMood(weightedScore / totalWeight);
}

function getTimeSignalMood(brackets: TimeBracket[]): MoodName {
	if (!brackets || !Array.isArray(brackets) || brackets.length === 0) {
		return 'deep_work';
	}
	const hour = new Date().getHours();
	for (const bracket of brackets) {
		const { start, end } = bracket;
		if (start > end) {
			// Wrap-around bracket (e.g. 22 to 6)
			if (hour >= start || hour < end) {
				return bracket.mood;
			}
		} else {
			// Standard bracket (e.g. 10 to 22)
			if (hour >= start && hour < end) {
				return bracket.mood;
			}
		}
	}
	return 'deep_work';
}

export { getTimeSignalMood };