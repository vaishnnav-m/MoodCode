import * as assert from 'assert';
import { getMood, getTimeSignalMood, type SignalScores } from '../moodEngine.js';
import { DEFAULT_BRACKETS, type TimeBracket, type SignalWeights } from '@moodcode/shared';

// Helper to mock the system hour for testing getTimeSignalMood
const originalGetHours = Date.prototype.getHours;
function mockSystemHour(hour: number) {
	Date.prototype.getHours = () => hour;
}
function restoreSystemHour() {
	Date.prototype.getHours = originalGetHours;
}

const mockBrackets: TimeBracket[] = [
	{ start: 6, end: 10, mood: 'morning', theme: 'GitHub Light Default' },
	{ start: 10, end: 12, mood: 'deep_work', theme: 'Tokyo Night' },
	{ start: 12, end: 14, mood: 'post_lunch', theme: 'One Dark Pro' },
	{ start: 22, end: 6, mood: 'late_night', theme: 'Dracula' }
];

console.log('--- RUNNING MOOD ENGINE UNIT TESTS ---');

try {
	// ==========================================
	// 1. Testing getTimeSignalMood
	// ==========================================
	console.log('Running getTimeSignalMood tests…');

	// Standard bracket: morning (6 to 10)
	mockSystemHour(8);
	assert.strictEqual(getTimeSignalMood(mockBrackets), 'morning');

	// Standard bracket: deep_work (10 to 12)
	mockSystemHour(11);
	assert.strictEqual(getTimeSignalMood(mockBrackets), 'deep_work');

	// Midnight wrap-around bracket: late_night (22 to 6)
	mockSystemHour(23);
	assert.strictEqual(getTimeSignalMood(mockBrackets), 'late_night');

	mockSystemHour(3);
	assert.strictEqual(getTimeSignalMood(mockBrackets), 'late_night');

	// Not matching wrap-around (15 is between 6 and 22, but not matching 12-14 or 22-6)
	// (Wait, in mockBrackets: 6-10 is morning, 10-12 deep_work, 12-14 post_lunch.
	// 14-22 is not defined in mockBrackets, so it should fallback to deep_work)
	mockSystemHour(15);
	assert.strictEqual(getTimeSignalMood(mockBrackets), 'deep_work');

	// Fallback for empty brackets
	assert.strictEqual(getTimeSignalMood([]), 'deep_work');

	console.log('✔ getTimeSignalMood tests passed.');

	// ==========================================
	// 2. Testing getMood
	// ==========================================
	console.log('Running getMood tests…');

	const weightsAllZero: SignalWeights = {
		time: 0,
		typing: 0,
		spotify: 0,
		weather: 0,
		git: 0
	};

	const weightsEqual: SignalWeights = {
		time: 50,
		typing: 50,
		spotify: 0,
		weather: 0,
		git: 0
	};

	const weightsComplex: SignalWeights = {
		time: 40,
		typing: 30,
		spotify: 30,
		weather: 0,
		git: 0
	};

	// Test 2.1: Fallback to time when all weights are 0
	mockSystemHour(8); // should match 'morning' from time signal
	assert.strictEqual(getMood(mockBrackets, weightsAllZero, {}), 'morning');

	// Test 2.2: Fallback to time when no active signal has scores
	assert.strictEqual(getMood(mockBrackets, weightsEqual, {}), 'morning');

	// Test 2.3: Single signal active (time weight 100, others 0)
	const weightsTimeOnly: SignalWeights = {
		time: 100,
		typing: 0,
		spotify: 0,
		weather: 0,
		git: 0
	};
	assert.strictEqual(getMood(mockBrackets, weightsTimeOnly, { time: 'late_night' }), 'late_night');

	// Test 2.4: Multiple signals active (time: 50, typing: 50)
	// morning (score 0), deep_work (score 2)
	// average score = (0*50 + 2*50)/100 = 1.0 -> 'post_lunch' (score 1)
	assert.strictEqual(
		getMood(mockBrackets, weightsEqual, { time: 'morning', typing: 'deep_work' }),
		'post_lunch'
	);

	// Test 2.5: Rounding to nearest MoodName
	// morning (score 0), late_night (score 3)
	// weight equal: average = 1.5 -> Math.round(1.5) = 2 -> 'deep_work' (score 2)
	assert.strictEqual(
		getMood(mockBrackets, weightsEqual, { time: 'morning', typing: 'late_night' }),
		'deep_work'
	);

	// average = 1.4 -> Math.round(1.4) = 1 -> 'post_lunch' (score 1)
	// weights: time = 60, typing = 40.
	// average = (0 * 60 + 3 * 40) / 100 = 1.2 -> Math.round(1.2) = 1 -> 'post_lunch'
	const weightsSixtyForty: SignalWeights = {
		time: 60,
		typing: 40,
		spotify: 0,
		weather: 0,
		git: 0
	};
	assert.strictEqual(
		getMood(mockBrackets, weightsSixtyForty, { time: 'morning', typing: 'late_night' }),
		'post_lunch'
	);

	// Test 2.6: Ignored signals that have undefined scores
	// time: 50 (score 'late_night' = 3), typing: 50 (score is undefined)
	// effective weight is only time (weight 50 / 50 = 1.0) -> 'late_night'
	assert.strictEqual(
		getMood(mockBrackets, weightsEqual, { time: 'late_night' }),
		'late_night'
	);

	console.log('✔ getMood tests passed.');

	console.log('--- ALL MOOD ENGINE TESTS PASSED SUCCESSFULLY ---');
} catch (error) {
	console.error('❌ Test suite failed:', error);
	process.exit(1);
} finally {
	restoreSystemHour();
}
