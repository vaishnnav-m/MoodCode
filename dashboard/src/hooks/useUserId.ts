import { useMemo } from 'react';

export function useUserIdFromQuery(): string | undefined {
  return useMemo(
    () => new URLSearchParams(window.location.search).get('userId') ?? undefined,
    [],
  );
}
