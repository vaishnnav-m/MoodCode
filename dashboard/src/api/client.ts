import axios from 'axios';

let userId: string | undefined;
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/** Axios client for MoodCode REST API (Vite dev proxy: /api → localhost:3001). */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (userId) {
    config.headers.set('x-user-id', userId);
  }
  return config;
});

/** Sets userId used in the x-user-id header on subsequent requests. */
export function setApiUserId(id: string): void {
  userId = id;
}
