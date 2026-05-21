import axios from 'axios';

let userId: string | undefined;

/** Axios client for MoodCode REST API (Vite dev proxy: /api → localhost:3001). */
export const api = axios.create({
  baseURL: '/api',
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
