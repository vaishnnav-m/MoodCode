import type { UserConfig } from '@moodcode/shared';
import { Router } from 'express';
import { User } from '../models/User.js';
import { broadcastConfigUpdate } from '../ws/server.js';

export const configRouter = Router();

function isUserConfigBody(body: unknown): body is UserConfig {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const { brackets, themeMappings, signalWeights } = body as UserConfig;
  return (
    Array.isArray(brackets) &&
    themeMappings !== null &&
    typeof themeMappings === 'object' &&
    signalWeights !== null &&
    typeof signalWeights === 'object'
  );
}

async function findOrCreateUser(userId: string) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = await User.create({ userId });
  }
  return user;
}

configRouter.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await findOrCreateUser(userId);
    const config: UserConfig = {
      brackets: user.brackets,
      themeMappings: user.themeMappings,
      signalWeights: user.signalWeights,
    };
    res.json(config);
  } catch (err) {
    console.error('GET /api/config/:userId failed:', err);
    res.status(500).json({ error: 'Failed to load config' });
  }
});

configRouter.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isUserConfigBody(req.body)) {
      res.status(400).json({ error: 'Body must include brackets, themeMappings, and signalWeights' });
      return;
    }

    const { brackets, themeMappings, signalWeights } = req.body;
    const user = await User.findOneAndUpdate(
      { userId },
      { brackets, themeMappings, signalWeights },
      { new: true, upsert: true, runValidators: true },
    );

    if (!user) {
      res.status(500).json({ error: 'Failed to save config' });
      return;
    }

    broadcastConfigUpdate(userId, user.brackets, user.themeMappings, user.signalWeights);

    const config: UserConfig = {
      brackets: user.brackets,
      themeMappings: user.themeMappings,
      signalWeights: user.signalWeights,
    };
    res.json(config);
  } catch (err) {
    console.error('PUT /api/config/:userId failed:', err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});
