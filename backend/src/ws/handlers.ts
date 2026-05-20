import type { ClientMessage, ServerMessage } from '@moodcode/shared';
import type { WebSocket } from 'ws';
import { MoodLog } from '../models/MoodLog.js';

const socketUsers = new Map<WebSocket, string>();

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== 'object' || !('type' in value)) {
    return false;
  }
  const { type } = value as { type: unknown };
  return type === 'register' || type === 'log_mood' || type === 'ping';
}

export function unregisterSocket(ws: WebSocket, wsMap: Map<string, WebSocket>): void {
  const userId = socketUsers.get(ws);
  if (!userId) {
    return;
  }
  if (wsMap.get(userId) === ws) {
    wsMap.delete(userId);
  }
  socketUsers.delete(ws);
}

export async function handleClientMessage(
  ws: WebSocket,
  wsMap: Map<string, WebSocket>,
  data: Buffer | ArrayBuffer | Buffer[],
): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.isBuffer(data) ? data.toString('utf8') : String(data));
  } catch {
    return;
  }

  if (!isClientMessage(parsed)) {
    return;
  }

  switch (parsed.type) {
    case 'register': {
      const { userId } = parsed;
      const existing = wsMap.get(userId);
      if (existing && existing !== ws) {
        unregisterSocket(existing, wsMap);
        existing.close();
      }
      wsMap.set(userId, ws);
      socketUsers.set(ws, userId);
      break;
    }
    case 'ping':
      send(ws, { type: 'pong' });
      break;
    case 'log_mood': {
      const userId = socketUsers.get(ws);
      if (!userId) {
        return;
      }
      const { mood, theme } = parsed;
      await MoodLog.create({ userId, mood, theme, source: 'time' });
      break;
    }
  }
}
