import * as vscode from 'vscode';
import type { MoodName } from '@moodcode/shared';

export interface TypingStats {
	wpm: number;
	backspaceRatio: number;
	pauseCount: number;
}

export interface TypingTracker {
	getStats(): TypingStats;
	reset(): void;
	dispose(): void;
}

export function createTypingTracker(): TypingTracker {
	let keystrokeCount = 0;
	let backspaceCount = 0;
	let pauseCount = 0;
	let lastKeystrokeTime = Date.now();
	let startTime = Date.now();

	const PAUSE_THRESHOLD_MS = 2000; // 2 seconds

	const listener = vscode.workspace.onDidChangeTextDocument((event) => {
		// Ignore background changes like output channels, git panels, and internal logs
		if (event.document.uri.scheme !== 'file' && event.document.uri.scheme !== 'untitled') {
			return;
		}

		const now = Date.now();
		
		for (const change of event.contentChanges) {
			const added = change.text.length;
			const deleted = change.rangeLength;

			if (added > 0) {
				keystrokeCount += added;
			} else if (deleted > 0) {
				backspaceCount += 1;
			}

			// Track pauses between keystrokes
			if (now - lastKeystrokeTime > PAUSE_THRESHOLD_MS) {
				pauseCount++;
			}
			lastKeystrokeTime = now;
		}
	});

	return {
		getStats() {
			const elapsedMinutes = (Date.now() - startTime) / 60000;
			const minutes = Math.max(elapsedMinutes, 0.1); // prevent division by zero

			const totalKeys = keystrokeCount + backspaceCount;
			const wpm = Math.round((keystrokeCount / 5) / minutes);
			const backspaceRatio = totalKeys > 0 ? backspaceCount / totalKeys : 0;

			return {
				wpm,
				backspaceRatio,
				pauseCount
			};
		},
		reset() {
			keystrokeCount = 0;
			backspaceCount = 0;
			pauseCount = 0;
			lastKeystrokeTime = Date.now();
			startTime = Date.now();
		},
		dispose() {
			listener.dispose();
		}
	};
}

export function getMoodFromTyping(stats: TypingStats): MoodName {
	const { wpm, backspaceRatio, pauseCount } = stats;

	// High intensity, high focus typing
	if (wpm >= 40) {
		return 'deep_work';
	}
	
	// Fatigue / frustration indicated by very high mistake ratio
	if (backspaceRatio >= 0.25) {
		return 'late_night';
	}

	// Normal steady pace
	if (wpm >= 15) {
		if (backspaceRatio < 0.12) {
			return 'morning';
		}
		return 'post_lunch';
	}

	// Slow, irregular pacing (high pauses) or fatigued
	if (pauseCount > 15) {
		return 'late_night';
	}

	return 'post_lunch';
}
