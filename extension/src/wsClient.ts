import type { ClientMessage, ServerMessage, TimeBracket, SpotifySignalPayload, SignalWeights } from '@moodcode/shared';
import WebSocket from 'ws';

export type ConfigUpdateHandler = (
	brackets: TimeBracket[],
	themeMappings: Record<string, string>,
	signalWeights: SignalWeights
) => void;
export type SpotifyUpdateHandler = (payload: SpotifySignalPayload) => void;

export interface WsClient {
	dispose(): void;
}

function isServerMessage(value: unknown): value is ServerMessage {
	if (!value || typeof value !== 'object' || !('type' in value)) {
		return false;
	}
	const { type } = value as { type: unknown };
	return type === 'config_update' || type === 'pong' || type === 'spotify_update' || type === 'weather_update';
}

export function createWsClient(
	wsUrl: string,
	userId: string,
	onConfigUpdate: ConfigUpdateHandler,
	onSpotifyUpdate: SpotifyUpdateHandler,
): WsClient {
	let ws: WebSocket | undefined;

	try {
		ws = new WebSocket(wsUrl);

		ws.on('open', () => {
			const message: ClientMessage = { type: 'register', userId };
			ws!.send(JSON.stringify(message));
		});

		ws.on('message', (data) => {
			let parsed: unknown;
			try {
				parsed = JSON.parse(data.toString());
			} catch {
				return;
			}

			if (!isServerMessage(parsed)) {
				return;
			}

			if (parsed.type === 'config_update' && Array.isArray(parsed.brackets)) {
				onConfigUpdate(
					parsed.brackets,
					parsed.themeMappings ?? {},
					parsed.signalWeights ?? {}
				);
			} else if (parsed.type === 'spotify_update' && parsed.payload) {
				onSpotifyUpdate(parsed.payload);
			}
		});

		ws.on('error', () => {
			// Backend unavailable — extension continues with local defaults.
		});
	} catch {
		// Connection failed — no crash.
	}

	return {
		dispose() {
			ws?.close();
			ws = undefined;
		},
	};
}
