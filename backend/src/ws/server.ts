import type { TimeBracket } from '@moodcode/shared';
import type { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { handleClientMessage, unregisterSocket } from './handlers.js';

const wsMap = new Map<string, WebSocket>();

/** Push updated brackets to the extension for this user. */
export function broadcastConfigUpdate(userId: string, brackets: TimeBracket[]): boolean {
  const ws = wsMap.get(userId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  ws.send(JSON.stringify({ type: 'config_update', brackets }));
  return true;
}

export function createWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      void handleClientMessage(ws, wsMap, data).catch((err) => {
        console.error('WebSocket message handler error:', err);
      });
    });

    ws.on('close', () => {
      unregisterSocket(ws, wsMap);
    });
  });

  return wss;
}
