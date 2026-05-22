import {
	DEFAULT_BRACKETS,
	THEME_DEFAULTS,
	type MoodName,
	type TimeBracket,
	type UserConfig,
} from '@moodcode/shared';
import { randomUUID } from 'crypto';
import * as vscode from 'vscode';

import { startBackendProcess } from './backendProcess.js';
import { registerCommands } from './commands.js';
import { getMood } from './moodEngine.js';
import { createOverrideManager } from './override.js';
import { createStatusBar } from './statusBar.js';
import { applyTheme } from './themeManager.js';
import { createWsClient } from './wsClient.js';

const USER_ID_KEY = 'moodcode.userId';

let brackets: TimeBracket[] = DEFAULT_BRACKETS;
let themeMappings: Record<MoodName, string> = { ...THEME_DEFAULTS };
let currentMood: MoodName | undefined;

async function getOrCreateUserId(context: vscode.ExtensionContext): Promise<string> {
	let userId = context.globalState.get<string>(USER_ID_KEY);
	if (!userId) {
		userId = randomUUID();
		await context.globalState.update(USER_ID_KEY, userId);
	}
	return userId;
}

function resolveTheme(mood: MoodName): string {
	return (
		themeMappings[mood] ??
		brackets.find((bracket) => bracket.mood === mood)?.theme ??
		THEME_DEFAULTS[mood]
	);
}

async function fetchConfig(backendUrl: string, userId: string): Promise<UserConfig | undefined> {
	try {
		const response = await fetch(`${backendUrl}/api/config/${userId}`);
		if (!response.ok) {
			return undefined;
		}
		return (await response.json()) as UserConfig;
	} catch {
		return undefined;
	}
}

async function logMoodSwitch(
	backendUrl: string,
	userId: string,
	mood: MoodName,
	theme: string,
	source: 'time' | 'override',
): Promise<void> {
	try {
		await fetch(`${backendUrl}/api/logs`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userId, mood, theme, source }),
		});
	} catch {
		// Backend unavailable — continue without logging.
	}
}

export function activate(context: vscode.ExtensionContext): void {
	const config = vscode.workspace.getConfiguration('moodcode');
	const backendUrl = config.get<string>('backendUrl', 'http://localhost:3001');
	const wsUrl = config.get<string>('wsUrl', 'ws://localhost:3001');
	const dashboardUrl = config.get<string>('dashboardUrl', 'http://localhost:5173');
	const pollIntervalMs = config.get<number>('pollIntervalMs', 60000);

	const overrideManager = createOverrideManager();
	const statusBar = createStatusBar();
	context.subscriptions.push(statusBar);

	async function evaluateAndApply(): Promise<void> {
		const activeOverride = overrideManager.getActive();
		const mood = activeOverride ? activeOverride.mood : getMood(brackets);
		const source = activeOverride ? 'override' : 'time';

		if (mood === currentMood) {
			statusBar.update(mood);
			return;
		}

		currentMood = mood;
		const theme = resolveTheme(mood);

		await applyTheme(theme);
		statusBar.update(mood);

		const userId = context.globalState.get<string>(USER_ID_KEY);
		if (userId) {
			await logMoodSwitch(backendUrl, userId, mood, theme, source);
		}
	}

	void (async () => {
		const backendProcess = await startBackendProcess(context);
		if (backendProcess) {
			context.subscriptions.push(backendProcess);
			// Wait for backend to be ready before fetching config
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		const userId = await getOrCreateUserId(context);

		const remoteConfig = await fetchConfig(backendUrl, userId);
		if (remoteConfig) {
			brackets = remoteConfig.brackets;
			themeMappings = remoteConfig.themeMappings;
		}

		registerCommands(context, {
			overrideManager,
			onRefresh: evaluateAndApply,
			dashboardUrl,
			userId,
		});

		const wsClient = createWsClient(wsUrl, userId, (updatedBrackets) => {
			brackets = updatedBrackets;
			void evaluateAndApply();
		});

		await evaluateAndApply();

		const pollTimer = setInterval(() => {
			if (overrideManager.isActive()) {
				return;
			}
			void evaluateAndApply();
		}, pollIntervalMs);

		context.subscriptions.push(
			{ dispose: () => wsClient.dispose() },
			{ dispose: () => clearInterval(pollTimer) },
		);
	})();
}

export function deactivate(): void { }
