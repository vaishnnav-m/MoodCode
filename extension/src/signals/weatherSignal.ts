import type { MoodName, WeatherSignalPayload } from '@moodcode/shared';

/**
 * Evaluates the Weather signal payload and maps it to a VS Code editor MoodName.
 * Logs out the decision process clearly for debugging purposes.
 */
export function getMoodFromWeather(payload: WeatherSignalPayload): MoodName {
	const { condition, temperature } = payload;
	let calculatedMood: MoodName;

	switch (condition) {
		case 'clear':
			calculatedMood = 'morning';
			break;
		case 'cloudy':
			calculatedMood = 'deep_work';
			break;
		case 'rainy':
			calculatedMood = 'post_lunch';
			break;
		case 'stormy':
			calculatedMood = 'late_night';
			break;
		default:
			calculatedMood = 'deep_work';
			break;
	}

	console.log(
		`[MoodCode - Weather] Evaluated weather condition:\n` +
		`  - Metrics: Condition=${condition}, Temperature=${temperature.toFixed(1)}°C\n` +
		`  - Resulting Mood: ${calculatedMood}`
	);

	return calculatedMood;
}
