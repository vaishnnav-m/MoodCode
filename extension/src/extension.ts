import {
	DEFAULT_BRACKETS,
	SignalWeights,
	THEME_DEFAULTS,
	DEFAULT_SIGNAL_WEIGHTS,
	type MoodName,
	type TimeBracket,
	type UserConfig,
} from '@moodcode/shared';
import { randomUUID } from 'crypto';
import * as vscode from 'vscode';
import { registerCommands } from './commands.js';
import { getMood, getTimeSignalMood, type SignalScores } from './moodEngine.js';
import { createTypingTracker, getMoodFromTyping } from './signals/typingSignal.js';
import { getMoodFromSpotify } from './signals/spotifySignal.js';
import { createOverrideManager } from './override.js';
import { createStatusBar } from './statusBar.js';
import { applyTheme } from './themeManager.js';
import { createWsClient } from './wsClient.js';

const USER_ID_KEY = 'moodcode.userId';

let brackets: TimeBracket[] = DEFAULT_BRACKETS;
let themeMappings: Record<MoodName, string> = { ...THEME_DEFAULTS };
let currentMood: MoodName | undefined;
let signalWeights: SignalWeights = { ...DEFAULT_SIGNAL_WEIGHTS };
let signalScores: SignalScores = {};

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
	source: 'time' | 'typing' | 'spotify' | 'weather' | 'git' | 'override',
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

	const typingTracker = createTypingTracker();
	context.subscriptions.push({ dispose: () => typingTracker.dispose() });

	async function evaluateAndApply(): Promise<void> {
		const activeOverride = overrideManager.getActive();
		signalScores.time = getTimeSignalMood(brackets);

		console.log(`[MoodCode] Evaluating active weights and scores...`);
		console.log(`  - Active Weights: ${JSON.stringify(signalWeights)}`);
		console.log(`  - Active Signal Scores: ${JSON.stringify(signalScores)}`);

		const mood = activeOverride ? activeOverride.mood : getMood(brackets, signalWeights, signalScores);
		
		let source: 'time' | 'typing' | 'spotify' | 'weather' | 'git' | 'override' = 'time';
		if (activeOverride) {
			source = 'override';
			console.log(`[MoodCode] Override is active. Using pinned override mood: ${mood}`);
		} else {
			// Find the contributing signal with the highest configured weight
			let maxWeight = 0;
			let bestSource: 'time' | 'typing' | 'spotify' | 'weather' | 'git' = 'time';
			
			const signalNames: ('time' | 'typing' | 'spotify' | 'weather' | 'git')[] = [
				'time', 'typing', 'spotify', 'weather', 'git'
			];
			
			for (const key of signalNames) {
				const weight = signalWeights[key] ?? 0;
				const score = signalScores[key];
				// Signal has contributed if it is configured and has an active score
				if (score !== undefined && weight > maxWeight) {
					maxWeight = weight;
					bestSource = key;
				}
			}
			source = bestSource;
			console.log(`[MoodCode] Blended mood computed by engine: ${mood} (Primary driver source: ${source}, Max Weight: ${maxWeight}%)`);
		}

		if (mood === currentMood) {
			statusBar.update(mood);
			console.log(`[MoodCode] Mood '${mood}' matches the current editor state. No theme switch needed.`);
			return;
		}

		console.log(`[MoodCode] Mood changed! Switching from '${currentMood}' to '${mood}'`);
		currentMood = mood;
		const theme = resolveTheme(mood);

		console.log(`[MoodCode] Applying VS Code theme mapping: ${theme}`);
		await applyTheme(theme);
		statusBar.update(mood);

		const userId = context.globalState.get<string>(USER_ID_KEY);
		if (userId) {
			console.log(`[MoodCode] Logging mood switch to database: Mood=${mood}, Theme=${theme}, Source=${source}`);
			await logMoodSwitch(backendUrl, userId, mood, theme, source);
		}
	}

	void (async () => {
		const userId = await getOrCreateUserId(context);

		const remoteConfig = await fetchConfig(backendUrl, userId);
		if (remoteConfig) {
			brackets = remoteConfig.brackets;
			themeMappings = remoteConfig.themeMappings;
			if (remoteConfig.signalWeights) {
				signalWeights = remoteConfig.signalWeights;
			}
		}

		registerCommands(context, {
			overrideManager,
			onRefresh: evaluateAndApply,
			dashboardUrl,
			userId,
		});

		const wsClient = createWsClient(
			wsUrl,
			userId,
			(updatedBrackets) => {
				console.log('[MoodCode] Received brackets configuration update via WebSocket.');
				brackets = updatedBrackets;
				void evaluateAndApply();
			},
			(spotifyPayload) => {
				console.log('[MoodCode] Received Spotify WebSocket update.');
				const spotifyMood = getMoodFromSpotify(spotifyPayload);
				signalScores.spotify = spotifyMood;
				void evaluateAndApply();
			}
		);

		await evaluateAndApply();

		const pollTimer = setInterval(() => {
			if (overrideManager.isActive()) {
				return;
			}
			void evaluateAndApply();
		}, pollIntervalMs);

		const typingTimer = setInterval(() => {
			if (overrideManager.isActive()) {
				return;
			}
			if (signalWeights.typing > 0) {
				const stats = typingTracker.getStats();
				signalScores.typing = getMoodFromTyping(stats);
				typingTracker.reset();
				void evaluateAndApply();
			}
		}, 300000);

		context.subscriptions.push(
			{ dispose: () => wsClient.dispose() },
			{ dispose: () => clearInterval(pollTimer) },
			{ dispose: () => clearInterval(typingTimer) },
		);
	})();
}

export function deactivate(): void { }
