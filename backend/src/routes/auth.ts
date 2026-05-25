import { Router } from 'express';
import { SpotifyToken } from '../models/SpotifyToken.js';

export const authRouter = Router();

// 1. GET /auth/spotify?userId=<uuid>
// Redirects the user to the Spotify OAuth consent screen
authRouter.get('/spotify', (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'Missing userId query parameter' });
      return;
    }

    const clientID = process.env.SPOTIFY_CLIENT_ID;
    const redirectURI = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientID || !redirectURI) {
      console.error('Spotify OAuth configuration is missing in environment variables');
      res.status(500).json({ error: 'Spotify OAuth not configured on server' });
      return;
    }

    const scope = 'user-read-currently-playing user-read-playback-state';
    
    // We pass the userId inside the 'state' parameter to retrieve it on callback
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientID,
      scope,
      redirect_uri: redirectURI,
      state: userId,
    });

    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    res.redirect(spotifyAuthUrl);
  } catch (err) {
    console.error('GET /auth/spotify failed:', err);
    res.status(500).json({ error: 'Failed to initiate Spotify OAuth' });
  }
});

// 2. GET /auth/spotify/callback
// Handles the redirect callback from Spotify, exchanges code for tokens, and saves in DB
authRouter.get('/spotify/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Spotify OAuth callback returned error:', error);
      res.status(400).json({ error: `Spotify OAuth error: ${error}` });
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing code parameter' });
      return;
    }

    if (!state || typeof state !== 'string') {
      res.status(400).json({ error: 'Missing state (userId) parameter' });
      return;
    }

    const clientID = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectURI = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientID || !clientSecret || !redirectURI) {
      console.error('Spotify OAuth configuration is missing in environment variables');
      res.status(500).json({ error: 'Spotify OAuth not configured on server' });
      return;
    }

    // Exchange the code for access + refresh tokens
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientID}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectURI,
      }).toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Spotify token exchange failed:', errText);
      res.status(response.status).json({ error: 'Failed to exchange token with Spotify' });
      return;
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      scope: string;
      expires_in: number;
      refresh_token: string;
    };

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    // Save tokens in database under the userId (from state)
    await SpotifyToken.findOneAndUpdate(
      { userId: state },
      {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        scope: data.scope,
      },
      { upsert: true, new: true }
    );

    // Redirect the user back to the personal config dashboard
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-vercel-url.vercel.app' 
      : 'http://localhost:5173';

    res.redirect(`${frontendUrl}/signals?spotify=success`);
  } catch (err) {
    console.error('GET /auth/spotify/callback failed:', err);
    res.status(500).json({ error: 'Failed to process Spotify OAuth callback' });
  }
});

// 3. GET /auth/spotify/status/:userId
// Returns whether Spotify is connected for a given userId
authRouter.get('/spotify/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const token = await SpotifyToken.findOne({ userId });
    res.json({ connected: !!token });
  } catch (err) {
    console.error('GET /auth/spotify/status/:userId failed:', err);
    res.status(500).json({ error: 'Failed to check Spotify status' });
  }
});
