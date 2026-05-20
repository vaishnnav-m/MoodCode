import type { MoodName } from '@moodcode/shared';
import { Router } from 'express';
import { MoodLog, type MoodLogSource } from '../models/MoodLog.js';

export const logsRouter = Router();

const MOOD_NAMES: MoodName[] = ['morning', 'deep_work', 'post_lunch', 'late_night'];
const LOG_SOURCES: MoodLogSource[] = ['time', 'spotify', 'weather', 'git', 'typing', 'override'];

function parseDays(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
  if (parsed === 7 || parsed === 30) {
    return parsed;
  }
  return 7;
}

function isCreateLogBody(body: unknown): body is {
  userId: string;
  mood: MoodName;
  theme: string;
  source: MoodLogSource;
  timestamp?: string;
} {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const { userId, mood, theme, source } = body as Record<string, unknown>;
  return (
    typeof userId === 'string' &&
    typeof mood === 'string' &&
    MOOD_NAMES.includes(mood as MoodName) &&
    typeof theme === 'string' &&
    typeof source === 'string' &&
    LOG_SOURCES.includes(source as MoodLogSource)
  );
}

logsRouter.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseDays(req.query.days);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await MoodLog.find({ userId, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .lean();

    res.json(logs);
  } catch (err) {
    console.error('GET /api/logs/:userId failed:', err);
    res.status(500).json({ error: 'Failed to load logs' });
  }
});

logsRouter.post('/', async (req, res) => {
  try {
    if (!isCreateLogBody(req.body)) {
      res.status(400).json({
        error: 'Body must include userId, mood, theme, and source',
      });
      return;
    }

    const { userId, mood, theme, source, timestamp } = req.body;
    const log = await MoodLog.create({
      userId,
      mood,
      theme,
      source,
      ...(timestamp ? { timestamp: new Date(timestamp) } : {}),
    });

    res.status(201).json(log);
  } catch (err) {
    console.error('POST /api/logs failed:', err);
    res.status(500).json({ error: 'Failed to create log' });
  }
});
