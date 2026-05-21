import type { ClientMessage, ServerMessage, TimeBracket } from '@moodcode/shared';
import WebSocket from 'ws';

export type ConfigUpdateHandler = (brackets: TimeBracket[]) => void;

export interface WsClient {
	dispose(): void;
}

function isServerMessage(value: unknown): value is ServerMessage {
	if (!value || typeof value !== 'object' || !('type' in value)) {
		return false;
	}
	const { type } = value as { type: unknown };
	return type === 'config_update' || type === 'pong';
}

export function createWsClient(
	wsUrl: string,
	userId: string,
	onConfigUpdate: ConfigUpdateHandler,
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
				onConfigUpdate(parsed.brackets);
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
