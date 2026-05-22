import type { TimeBracket } from '@moodcode/shared';
import type { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { handleClientMessage, unregisterSocket } from './handlers.js';

const wsMap = new Map<string, WebSocket>();

/** Push updated brackets to the extension for this user. */
export function broadcastConfigUpdate(userId: string, brackets: TimeBracket[]): boolean {
  const ws = wsMap.get(userId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log(`[WS] Cannot push to ${userId} — not connected`);
    return false;
  }
  console.log(`[WS] Pushing config update to ${userId}`);
  ws.send(JSON.stringify({ type: 'config_update', brackets }));
  return true;
}

export function createWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS] Client connected from ${ip}`);

    ws.on('message', (data) => {
      console.log(`[WS] Message received: ${data.toString()}`);
      void handleClientMessage(ws, wsMap, data).catch((err) => {
        console.error('WebSocket message handler error:', err);
      });
    });

    ws.on('close', (code, reason) => {
      console.log(`[WS] Client disconnected — code: ${code}, reason: ${reason.toString()}`);
      unregisterSocket(ws, wsMap);
    });
  });

  console.log('[WS] WebSocket server created');
  return wss;
}
