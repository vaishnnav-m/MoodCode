import { type UserConfig, DEFAULT_SIGNAL_WEIGHTS } from '@moodcode/shared';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { getConfig, saveConfig } from '../api/config';

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : 'Request failed';
}

export function useConfig(userId: string | undefined) {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setConfig(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getConfig(userId);
      setConfig({
        ...data,
        signalWeights: data.signalWeights ?? DEFAULT_SIGNAL_WEIGHTS,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  const save = useCallback(
    async (next?: UserConfig) => {
      if (!userId) {
        return;
      }
      const payload = next ?? config;
      if (!payload) {
        return;
      }
      const payloadWithWeights: UserConfig = {
        ...payload,
        signalWeights: payload.signalWeights ?? config?.signalWeights ?? DEFAULT_SIGNAL_WEIGHTS,
      };
      setSaving(true);
      setError(null);
      try {
        const data = await saveConfig(userId, payloadWithWeights);
        setConfig({
          ...data,
          signalWeights: data.signalWeights ?? DEFAULT_SIGNAL_WEIGHTS,
        });
      } catch (err) {
        setError(errorMessage(err));
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [userId, config],
  );

  return {
    config,
    setConfig,
    loading,
    saving,
    error,
    refetch,
    save,
  };
}
