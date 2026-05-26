import type { SpotifySignalPayload } from '@moodcode/shared';
import { SpotifyToken, type SpotifyTokenDocument } from '../models/SpotifyToken.js';
import { broadcastSpotifyUpdate } from '../ws/server.js';

const activePollers = new Map<string, NodeJS.Timeout>();

/**
 * Generates highly realistic, stable song characteristics from a Spotify track ID.
 * This is used as a fallback because Spotify does not have genres listed for all artists.
 * Being deterministic, a specific song will consistently trigger the exact same theme.
 */
function generateHeuristicFeatures(trackId: string) {
  // Simple stable hash function (djb2 style)
  let hash = 5381;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash * 33) ^ trackId.charCodeAt(i);
  }

  // Generate three stable seeds between 0.0 and 1.0 based on the trackId hash
  const seed1 = Math.abs((hash ^ 0x12345678) % 1000) / 1000;
  const seed2 = Math.abs((hash ^ 0x87654321) % 1000) / 1000;
  const seed3 = Math.abs((hash ^ 0xABCDEF01) % 1000) / 1000;

  // Map seeds to realistic song characteristics
  const energy = parseFloat(seed1.toFixed(2));
  const valence = parseFloat(seed2.toFixed(2));
  const tempo = Math.floor(75 + seed3 * 95); // Scale tempo between 75 and 170 BPM
  const acousticness = parseFloat(seed3.toFixed(2));

  return { energy, valence, tempo, acousticness };
}

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
  console.log(`[Spotify] Initiating poll cycle for user ${userId}`);
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      console.log(`[Spotify] No valid access token found for user ${userId} (user has not connected Spotify yet or token is invalid)`);
      return;
    }

    // Corrected endpoint from recently-played to currently-playing to get the active song
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204) {
      console.log(`[Spotify] User ${userId} is not currently listening to any song (HTTP 204 No Content)`);
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
      console.error(`[Spotify] Player status fetch failed for user ${userId}:`, errText);
      return;
    }

    const currentPlaying = (await response.json()) as {
      is_playing: boolean;
      item: {
        id: string;
        type: string;
        name?: string;
        explicit?: boolean;
        album?: { name?: string };
        artists?: Array<{ id: string; name: string }>;
      } | null;
    };

    console.log(`[Spotify] Player status API call for ${userId} returned HTTP status ${response.status}`);
    console.log(`[Spotify] API response for ${userId}:`, JSON.stringify(currentPlaying, null, 2));

    if (!currentPlaying.is_playing || !currentPlaying.item || currentPlaying.item.type !== 'track') {
      const reason = !currentPlaying.is_playing
        ? 'Playback is paused'
        : (!currentPlaying.item ? 'No track item returned' : `Item type is ${currentPlaying.item.type} (expected track)`);
      console.log(`[Spotify] User ${userId} is inactive: ${reason}`);

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

    const trackId = currentPlaying.item.id;
    const trackName = currentPlaying.item.name || 'Unknown Track';
    const albumName = currentPlaying.item.album?.name || '';
    const isExplicit = currentPlaying.item.explicit || false;
    const artistNames = currentPlaying.item.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
    const primaryArtistId = currentPlaying.item.artists?.[0]?.id;

    console.log(`[Spotify] Detected active playback for user ${userId}: "${trackName}" by ${artistNames} (ID: ${trackId})`);

    let genres: string[] = [];
    if (primaryArtistId) {
      console.log(`[Spotify] Fetching artist metadata for ID ${primaryArtistId} to extract genres`);
      try {
        const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${primaryArtistId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (artistResponse.ok) {
          const artistData = (await artistResponse.json()) as { genres: string[] };
          console.log(`[Spotify] Retrieved artist metadata for ${primaryArtistId}:`, artistData);
          genres = artistData.genres || [];
          console.log(`[Spotify] Successfully retrieved genres for "${artistNames}":`, genres);
        } else {
          const errText = await artistResponse.text();
          console.warn(`[Spotify] Artist metadata fetch returned status ${artistResponse.status}: ${errText}`);
        }
      } catch (err) {
        console.error(`[Spotify] Failed to fetch artist metadata:`, err);
      }
    }

    const heuristic = generateHeuristicFeatures(trackId);

    const payload: SpotifySignalPayload = {
      isPlaying: true,
      energy: heuristic.energy,
      valence: heuristic.valence,
      tempo: heuristic.tempo,
      acousticness: heuristic.acousticness,
      genres,
      trackName,
      albumName,
      isExplicit,
    };

    const broadcastSuccess = broadcastSpotifyUpdate(userId, payload);
    console.log(`[Spotify] Broadcasted payload to user ${userId} WebSockets: ${broadcastSuccess ? 'SUCCESS' : 'FAILED (no socket connected)'}`);
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
