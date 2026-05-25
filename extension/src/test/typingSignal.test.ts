import * as assert from 'assert';
import { Module } from 'module';

// 1. Mock 'vscode' module dynamically before importing typingSignal
let textDocumentChangeCallback: ((e: any) => void) | undefined;

const mockVscode = {
	workspace: {
		onDidChangeTextDocument: (cb: (e: any) => void) => {
			textDocumentChangeCallback = cb;
			return { dispose: () => {} };
		}
	}
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
	if (id === 'vscode') {
		return mockVscode;
	}
	return originalRequire.apply(this, arguments as any);
};

// 2. Import typingSignal
import { createTypingTracker, getMoodFromTyping } from '../signals/typingSignal.js';

console.log('--- RUNNING TYPING SIGNAL UNIT TESTS ---');

try {
	// ==========================================
	// 1. Testing getMoodFromTyping
	// ==========================================
	console.log('Running getMoodFromTyping tests…');

	// High WPM -> deep_work
	assert.strictEqual(getMoodFromTyping({ wpm: 45, backspaceRatio: 0.05, pauseCount: 2 }), 'deep_work');
	assert.strictEqual(getMoodFromTyping({ wpm: 40, backspaceRatio: 0.1, pauseCount: 5 }), 'deep_work');

	// High backspaceRatio -> late_night
	assert.strictEqual(getMoodFromTyping({ wpm: 30, backspaceRatio: 0.3, pauseCount: 2 }), 'late_night');
	assert.strictEqual(getMoodFromTyping({ wpm: 10, backspaceRatio: 0.26, pauseCount: 0 }), 'late_night');

	// Steady pacing, moderate WPM, low errors -> morning
	assert.strictEqual(getMoodFromTyping({ wpm: 25, backspaceRatio: 0.05, pauseCount: 2 }), 'morning');
	assert.strictEqual(getMoodFromTyping({ wpm: 15, backspaceRatio: 0.10, pauseCount: 1 }), 'morning');

	// Moderate WPM, moderate errors -> post_lunch
	assert.strictEqual(getMoodFromTyping({ wpm: 20, backspaceRatio: 0.15, pauseCount: 2 }), 'post_lunch');

	// Slow, irregular typing -> late_night (due to high pause count)
	assert.strictEqual(getMoodFromTyping({ wpm: 10, backspaceRatio: 0.05, pauseCount: 20 }), 'late_night');

	// Slow, regular typing -> post_lunch
	assert.strictEqual(getMoodFromTyping({ wpm: 8, backspaceRatio: 0.05, pauseCount: 2 }), 'post_lunch');

	console.log('✔ getMoodFromTyping tests passed.');

	// ==========================================
	// 2. Testing createTypingTracker
	// ==========================================
	console.log('Running createTypingTracker tests…');

	const tracker = createTypingTracker();

	assert.ok(textDocumentChangeCallback !== undefined, 'onDidChangeTextDocument listener should be registered');

	// Simulate typing additions
	textDocumentChangeCallback!({
		document: {
			uri: { scheme: 'file' }
		},
		contentChanges: [
			{ text: 'hello', rangeLength: 0 },
			{ text: ' world', rangeLength: 0 }
		]
	});

	// Simulate deletions/backspaces
	textDocumentChangeCallback!({
		document: {
			uri: { scheme: 'file' }
		},
		contentChanges: [
			{ text: '', rangeLength: 1 }
		]
	});

	const stats = tracker.getStats();
	
	// additions length = 11 ('hello world'). deletions count = 1. totalKeys = 12.
	// backspaceRatio = 1 / 12 = 0.0833
	assert.ok(stats.backspaceRatio > 0.08 && stats.backspaceRatio < 0.09, `Backspace ratio should be around 0.08, got ${stats.backspaceRatio}`);
	
	tracker.reset();
	const statsAfterReset = tracker.getStats();
	assert.strictEqual(statsAfterReset.wpm, 0);
	assert.strictEqual(statsAfterReset.backspaceRatio, 0);
	assert.strictEqual(statsAfterReset.pauseCount, 0);

	tracker.dispose();
	console.log('✔ createTypingTracker tests passed.');

	console.log('--- ALL TYPING SIGNAL TESTS PASSED SUCCESSFULLY ---');
} catch (error) {
	console.error('❌ Test suite failed:', error);
	process.exit(1);
}
