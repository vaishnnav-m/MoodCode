import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface SpotifyStatusResponse {
  connected: boolean;
}

/**
 * Checks the Spotify connection status for a given user ID.
 * Calls GET /auth/spotify/status/:userId
 */
export async function getSpotifyStatus(userId: string): Promise<SpotifyStatusResponse> {
  const { data } = await axios.get<SpotifyStatusResponse>(
    `${BACKEND_URL}/auth/spotify/status/${userId}`
  );
  return data;
}

/**
 * Initiates the Spotify connection flow by redirecting the user to the
 * Railway backend Spotify OAuth consent endpoint.
 * Redirects to GET /auth/spotify?userId=...
 */
export function initiateSpotifyConnect(userId: string): void {
  window.location.href = `${BACKEND_URL}/auth/spotify?userId=${encodeURIComponent(userId)}`;
}
