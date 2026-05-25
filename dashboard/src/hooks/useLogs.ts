import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { getLogs, type MoodLogEntry } from '../api/logs';

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : 'Request failed';
}

export function useLogs(userId: string | undefined) {
  const [logs, setLogs] = useState<MoodLogEntry[]>([]);
  const [days, setDays] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLogs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getLogs(userId, days);
      setLogs(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  return {
    logs,
    days,
    setDays,
    loading,
    error,
    refetch,
  };
}

export type { MoodLogEntry };
