import type { MoodName, SignalWeights, TimeBracket } from '@moodcode/shared';

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
	const total = Object.values(weights).reduce((a, b) => a + b, 0);
	if (total === 0) {
		return weights;
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
	weights: SignalWeights,
	signals: SignalScores,
): MoodName {
	const normalized = normalizeWeights(weights);
	let weightedScore = 0;
	let totalWeight = 0;

	// Time signal
	if (signals.time && normalized.time > 0) {
		weightedScore += MOOD_SCORES[signals.time] * normalized.time;
		totalWeight += normalized.time;
	}

	// Typing signal
	if (signals.typing && normalized.typing > 0) {
		weightedScore += MOOD_SCORES[signals.typing] * normalized.typing;
		totalWeight += normalized.typing;
	}

	// Future signals slot in here automatically
	if (signals.spotify && normalized.spotify > 0) {
		weightedScore += MOOD_SCORES[signals.spotify] * normalized.spotify;
		totalWeight += normalized.spotify;
	}

	// Fallback to time if no signals available
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
		if (hour >= bracket.start && hour < bracket.end) {
			return bracket.mood;
		}
	}
	return 'deep_work';
}

export { getTimeSignalMood };