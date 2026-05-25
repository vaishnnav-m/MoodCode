import type { SpotifySignalPayload } from '@moodcode/shared';
import { SpotifyToken, type SpotifyTokenDocument } from '../models/SpotifyToken.js';
import { broadcastSpotifyUpdate } from '../ws/server.js';

const activePollers = new Map<string, NodeJS.Timeout>();

async function refreshSpotifyToken(tokenDoc: SpotifyTokenDocument): Promise<string> {
  const clientID = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    throw new Error('Spotify credentials missing from environment variables');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientID}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenDoc.refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh Spotify token: ${errText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token?: string;
  };

  tokenDoc.accessToken = data.access_token;
  if (data.refresh_token) {
    tokenDoc.refreshToken = data.refresh_token;
  }
  tokenDoc.expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await tokenDoc.save();

  return tokenDoc.accessToken;
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokenDoc = await SpotifyToken.findOne({ userId });
  if (!tokenDoc) {
    return null;
  }

  // If token is expired or expiring in the next 60 seconds, refresh it
  const isExpiring = tokenDoc.expiresAt.getTime() - Date.now() < 60000;
  if (isExpiring) {
    try {
      console.log(`[Spotify] Token expiring for user ${userId}. Refreshing...`);
      return await refreshSpotifyToken(tokenDoc);
    } catch (err) {
      console.error(`[Spotify] Failed to refresh token for user ${userId}:`, err);
      return null;
    }
  }

  return tokenDoc.accessToken;
}

export async function pollUserSpotify(userId: string): Promise<void> {
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      // User has not connected Spotify yet
      return;
    }

    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204) {
      // No track currently playing
      const payload: SpotifySignalPayload = {
        isPlaying: false,
        energy: 0,
        valence: 0,
        tempo: 0,
        acousticness: 0,
      };
      broadcastSpotifyUpdate(userId, payload);
      return;
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Spotify] Currently playing fetch failed for user ${userId}:`, errText);
      return;
    }

    const currentPlaying = (await response.json()) as {
      is_playing: boolean;
      item: {
        id: string;
        type: string;
      } | null;
    };

    if (!currentPlaying.is_playing || !currentPlaying.item || currentPlaying.item.type !== 'track') {
      const payload: SpotifySignalPayload = {
        isPlaying: false,
        energy: 0,
        valence: 0,
        tempo: 0,
        acousticness: 0,
      };
      broadcastSpotifyUpdate(userId, payload);
      return;
    }

    // Fetch audio features for the track
    const trackId = currentPlaying.item.id;
    const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!featuresResponse.ok) {
      const errText = await featuresResponse.text();
      console.error(`[Spotify] Audio features fetch failed for track ${trackId} / user ${userId}:`, errText);
      return;
    }

    const features = (await featuresResponse.json()) as {
      energy: number;
      valence: number;
      tempo: number;
      acousticness: number;
    };

    const payload: SpotifySignalPayload = {
      isPlaying: true,
      energy: features.energy,
      valence: features.valence,
      tempo: features.tempo,
      acousticness: features.acousticness,
    };

    broadcastSpotifyUpdate(userId, payload);
  } catch (err) {
    console.error(`[Spotify] Polling failed for user ${userId}:`, err);
  }
}

export function startSpotifyPolling(userId: string): void {
  if (activePollers.has(userId)) {
    return;
  }

  console.log(`[Spotify] Starting poller for user ${userId}`);
  // Run once immediately
  void pollUserSpotify(userId);

  const interval = setInterval(() => {
    void pollUserSpotify(userId);
  }, 30000);

  activePollers.set(userId, interval);
}

export function stopSpotifyPolling(userId: string): void {
  const interval = activePollers.get(userId);
  if (interval) {
    console.log(`[Spotify] Stopping poller for user ${userId}`);
    clearInterval(interval);
    activePollers.delete(userId);
  }
}
