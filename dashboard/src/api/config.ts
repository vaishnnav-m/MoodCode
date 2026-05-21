import type { UserConfig } from '@moodcode/shared';
import { api, setApiUserId } from './client';

export async function getConfig(userId: string): Promise<UserConfig> {
  setApiUserId(userId);
  const { data } = await api.get<UserConfig>(`/config/${userId}`);
  return data;
}

export async function saveConfig(userId: string, config: UserConfig): Promise<UserConfig> {
  setApiUserId(userId);
  const { data } = await api.put<UserConfig>(`/config/${userId}`, config);
  return data;
}
