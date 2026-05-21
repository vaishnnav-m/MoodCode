import type { MoodName } from '@moodcode/shared';
import { api, setApiUserId } from './client';

export type MoodLogSource =
  | 'time'
  | 'spotify'
  | 'weather'
  | 'git'
  | 'typing'
  | 'override';

export interface MoodLogEntry {
  _id: string;
  userId: string;
  mood: MoodName;
  theme: string;
  source: MoodLogSource;
  timestamp: string;
}

export async function getLogs(
  userId: string,
  days: 7 | 30 = 7,
): Promise<MoodLogEntry[]> {
  setApiUserId(userId);
  const { data } = await api.get<MoodLogEntry[]>(`/logs/${userId}`, {
    params: { days },
  });
  return data;
}
