import type { TimeBracket, SpotifySignalPayload, WeatherSignalPayload, SignalWeights } from '@moodcode/shared';
import type { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { handleClientMessage, unregisterSocket } from './handlers.js';

const wsMap = new Map<string, WebSocket>();

/** Push updated configuration to the extension for this user. */
export function broadcastConfigUpdate(
  userId: string,
  brackets: TimeBracket[],
  themeMappings: Record<string, string>,
  signalWeights: SignalWeights
): boolean {
  const ws = wsMap.get(userId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log(`[WS] Cannot push to ${userId} — not connected`);
    return false;
  }
  console.log(`[WS] Pushing config update to ${userId}`);
  ws.send(JSON.stringify({ type: 'config_update', brackets, themeMappings, signalWeights }));
  return true;
}

/** Push Spotify update to the extension for this user. */
export function broadcastSpotifyUpdate(userId: string, payload: SpotifySignalPayload): boolean {
  const ws = wsMap.get(userId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  console.log(`[WS] Pushing Spotify update to ${userId}`);
  ws.send(JSON.stringify({ type: 'spotify_update', payload }));
  return true;
}

/** Push Weather update to the extension for this user. */
export function broadcastWeatherUpdate(userId: string, payload: WeatherSignalPayload): boolean {
  const ws = wsMap.get(userId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  console.log(`[WS] Pushing weather update to ${userId}`);
  ws.send(JSON.stringify({ type: 'weather_update', payload }));
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
