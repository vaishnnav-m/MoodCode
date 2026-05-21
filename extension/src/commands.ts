import type { MoodName } from '@moodcode/shared';
import * as vscode from 'vscode';

import {
	OVERRIDE_DURATION_HOURS,
	type OverrideDurationHours,
	type OverrideManager,
} from './override';

const MOOD_NAMES: MoodName[] = ['morning', 'deep_work', 'post_lunch', 'late_night'];

export interface CommandsDeps {
	overrideManager: OverrideManager;
	onRefresh: () => void | Promise<void>;
	dashboardUrl?: string;
}

function formatMoodLabel(mood: MoodName): string {
	return mood
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

export function registerCommands(
	context: vscode.ExtensionContext,
	deps: CommandsDeps,
): void {
	const dashboardUrl = deps.dashboardUrl ?? 'http://localhost:5173';

	context.subscriptions.push(
		vscode.commands.registerCommand('moodcode.override', async () => {
			const moodPick = await vscode.window.showQuickPick(
				MOOD_NAMES.map((mood) => ({
					label: formatMoodLabel(mood),
					mood,
				})),
				{ title: 'Pin mood override', placeHolder: 'Select mood' },
			);
			if (!moodPick) {
				return;
			}

			const hoursPick = await vscode.window.showQuickPick(
				OVERRIDE_DURATION_HOURS.map((hours) => ({
					label: `${hours} hour${hours > 1 ? 's' : ''}`,
					hours,
				})),
				{ title: 'Override duration', placeHolder: 'How long to pin?' },
			);
			if (!hoursPick) {
				return;
			}

			deps.overrideManager.set(
				moodPick.mood,
				hoursPick.hours as OverrideDurationHours,
			);
			await deps.onRefresh();

			vscode.window.showInformationMessage(
				`MoodCode: pinned ${formatMoodLabel(moodPick.mood)} for ${hoursPick.hours} hour(s).`,
			);
		}),

		vscode.commands.registerCommand('moodcode.refresh', async () => {
			await deps.onRefresh();
		}),

		vscode.commands.registerCommand('moodcode.openDashboard', async () => {
			await vscode.env.openExternal(vscode.Uri.parse(dashboardUrl));
		}),
	);
}
