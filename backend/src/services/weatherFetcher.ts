import type { WeatherSignalPayload } from '@moodcode/shared';
import { broadcastWeatherUpdate } from '../ws/server.js';

interface CacheEntry {
  payload: WeatherSignalPayload;
  timestamp: number;
}

interface GeoLocation {
  lat: number;
  lon: number;
}

const weatherCache = new Map<string, CacheEntry>();
const activePollers = new Map<string, NodeJS.Timeout>();
const lastPushedCondition = new Map<string, string>();

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Check if the given IP is private or a loopback address. */
function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1')) {
    return true;
  }
  // Check private IPv4 ranges: 10.x.x.x, 172.16.x.x-172.31.x.x, 192.168.x.x
  if (/^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(ip)) {
    return true;
  }
  // Check loopback / link-local / private IPv6 ranges
  if (ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }
  return false;
}

/** Geolocate an IP address using ip-api.com. Fallback to server geolocator or default coordinates on failure. */
async function geolocateIp(ip: string): Promise<GeoLocation> {
  let url = `http://ip-api.com/json/${ip}`;
  if (isPrivateIp(ip)) {
    console.log(`[Weather] IP ${ip} is a private/loopback IP. Geolocating server public IP instead.`);
    url = 'http://ip-api.com/json/';
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`IP geolocation API returned status ${res.status}`);
    }
    const data = (await res.json()) as { status: string; lat?: number; lon?: number; message?: string };
    if (data.status === 'success' && typeof data.lat === 'number' && typeof data.lon === 'number') {
      return { lat: data.lat, lon: data.lon };
    }
    throw new Error(data.message || 'Unknown error from geolocation API');
  } catch (err) {
    console.warn(`[Weather] Failed to geolocate IP "${ip}":`, err, '. Falling back to San Francisco coordinates.');
    return { lat: 37.7749, lon: -122.4194 }; // San Francisco default
  }
}

/** Map OpenWeatherMap conditions (by condition ID and main string) to the 4 default states. */
function mapWeatherCondition(id: number, main: string): 'clear' | 'cloudy' | 'rainy' | 'stormy' {
  if (id >= 200 && id < 300) {
    return 'stormy';
  }
  if ((id >= 300 && id < 600) || (id >= 600 && id < 700)) { // Rain, Drizzle, Snow
    return 'rainy';
  }
  if (id >= 700 && id < 800) { // Atmosphere (Mist, smoke, haze, fog, etc)
    return 'cloudy';
  }
  if (id === 800) {
    return 'clear';
  }
  if (id > 800 && id < 900) { // Clouds
    return 'cloudy';
  }

  // Fallback text check
  const mainLower = main.toLowerCase();
  if (mainLower.includes('thunderstorm') || mainLower.includes('storm')) {
    return 'stormy';
  }
  if (mainLower.includes('rain') || mainLower.includes('drizzle') || mainLower.includes('snow')) {
    return 'rainy';
  }
  if (mainLower.includes('cloud') || mainLower.includes('mist') || mainLower.includes('haze') || mainLower.includes('fog')) {
    return 'cloudy';
  }
  return 'clear';
}

/** Fetch current weather metrics from OpenWeatherMap API using coordinates. */
async function fetchOwmWeather(lat: number, lon: number): Promise<WeatherSignalPayload | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.warn('[Weather] OPENWEATHER_API_KEY is not set in environment variables. Cannot fetch weather.');
    return null;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenWeatherMap API returned status ${res.status}: ${text}`);
    }
    const data = (await res.json()) as {
      weather: { id: number; main: string }[];
      main: { temp: number };
    };

    if (!data.weather || data.weather.length === 0 || !data.main) {
      throw new Error('Invalid response structure from OpenWeatherMap');
    }

    const condition = mapWeatherCondition(data.weather[0].id, data.weather[0].main);
    const temperature = data.main.temp;

    return { condition, temperature };
  } catch (err) {
    console.error('[Weather] Error calling OpenWeatherMap API:', err);
    return null;
  }
}

/** Fetch weather for a given IP with a 15-minute in-memory cache TTL. */
async function getWeatherDataForIp(ip: string): Promise<WeatherSignalPayload | null> {
  const cached = weatherCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Weather] Returning cached weather for IP ${ip}`);
    return cached.payload;
  }

  console.log(`[Weather] Cache miss or expired for IP ${ip}. Fetching new data.`);
  const coords = await geolocateIp(ip);
  const payload = await fetchOwmWeather(coords.lat, coords.lon);
  if (payload) {
    weatherCache.set(ip, {
      payload,
      timestamp: Date.now(),
    });
  }
  return payload;
}

/** Poll current weather details for a specific user and broadcast changes. */
export async function pollUserWeather(userId: string, ip: string): Promise<void> {
  try {
    const payload = await getWeatherDataForIp(ip);
    if (!payload) {
      return;
    }

    const lastCondition = lastPushedCondition.get(userId);
    // Push update if it is the initial connection or if the weather condition changed
    if (lastCondition === undefined || payload.condition !== lastCondition) {
      console.log(`[Weather] Pushing weather update to user ${userId}: ${payload.condition} (${payload.temperature}°C)`);
      broadcastWeatherUpdate(userId, payload);
      lastPushedCondition.set(userId, payload.condition);
    } else {
      console.log(`[Weather] Weather condition unchanged (${payload.condition}) for user ${userId}. Skipping push.`);
    }
  } catch (err) {
    console.error(`[Weather] Polling failed for user ${userId}:`, err);
  }
}

/** Start a periodic weather poller (every 15 minutes) for a registered user connection. */
export function startWeatherPolling(userId: string, ip: string): void {
  if (activePollers.has(userId)) {
    return;
  }

  console.log(`[Weather] Starting weather poller for user ${userId} (IP: ${ip})`);
  lastPushedCondition.delete(userId); // Ensure initial push happens immediately

  // Run once immediately
  void pollUserWeather(userId, ip);

  const interval = setInterval(() => {
    void pollUserWeather(userId, ip);
  }, 15 * 60 * 1000);

  activePollers.set(userId, interval);
}

/** Stop the weather poller and clear state trackers for a user. */
export function stopWeatherPolling(userId: string): void {
  const interval = activePollers.get(userId);
  if (interval) {
    console.log(`[Weather] Stopping weather poller for user ${userId}`);
    clearInterval(interval);
    activePollers.delete(userId);
  }
  lastPushedCondition.delete(userId);
}
