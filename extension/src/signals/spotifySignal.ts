import type { MoodName, SpotifySignalPayload } from '@moodcode/shared';

/**
 * Evaluates the Spotify signal payload and maps it to a VS Code editor MoodName.
 * Logs out the decision process clearly for debugging purposes.
 */
export function getMoodFromSpotify(payload: SpotifySignalPayload): MoodName | undefined {
	if (!payload.isPlaying) {
		console.log('[MoodCode - Spotify] Player is inactive or paused. Skipping Spotify signal evaluation.');
		return undefined;
	}

	const { energy, valence, tempo, acousticness } = payload;
	let calculatedMood: MoodName = 'post_lunch';

	// High energy + high valence + fast tempo -> deep_work
	if (energy >= 0.7 && valence >= 0.6 && tempo >= 120) {
		calculatedMood = 'deep_work';
	}
	// Low energy + low valence + slow tempo -> late_night
	else if (energy < 0.4 && valence < 0.4 && tempo < 95) {
		calculatedMood = 'late_night';
	}
	// High acousticness + medium/high valence -> morning
	else if (acousticness >= 0.6 && valence >= 0.3) {
		calculatedMood = 'morning';
	}
	// Default fallback -> post_lunch
	else {
		calculatedMood = 'post_lunch';
	}

	console.log(
		`[MoodCode - Spotify] Evaluated active playback:\n` +
		`  - Metrics: Energy=${energy.toFixed(2)}, Valence=${valence.toFixed(2)}, Tempo=${tempo.toFixed(0)} BPM, Acousticness=${acousticness.toFixed(2)}\n` +
		`  - Resulting Mood: ${calculatedMood}`
	);

	return calculatedMood;
}
