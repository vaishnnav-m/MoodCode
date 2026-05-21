import type { MoodName } from '@moodcode/shared';
import * as vscode from 'vscode';

export interface MoodStatusBar {
	update(mood: MoodName): void;
	dispose(): void;
}

function formatMoodName(mood: MoodName): string {
	return mood
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

export function createStatusBar(): MoodStatusBar {
	const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

	return {
		update(mood: MoodName) {
			const label = formatMoodName(mood);
			item.text = `$(symbol-misc) MoodCode: ${label}`;
			item.tooltip = `Current mood: ${label}`;
			item.show();
		},
		dispose() {
			item.dispose();
		},
	};
}
