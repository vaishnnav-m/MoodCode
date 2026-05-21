import type { MoodName } from '@moodcode/shared';
import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLogs } from '../hooks/useLogs';
import { useUserIdFromQuery } from '../hooks/useUserId';
import { formatMoodLabel, MOOD_NAMES } from '../utils/mood';
import '../styles/dashboard-page.css';
import './HistoryPage.css';

const MOOD_VALUE: Record<MoodName, number> = {
  morning: 1,
  deep_work: 2,
  post_lunch: 3,
  late_night: 4,
};

function moodFromValue(value: number): string {
  const mood = MOOD_NAMES[value - 1];
  return mood ? formatMoodLabel(mood) : '';
}

export default function HistoryPage() {
  const userId = useUserIdFromQuery();
  const { logs, days, setDays, loading, error } = useLogs(userId);

  const chartData = useMemo(
    () =>
      logs.map((log) => ({
        at: new Date(log.timestamp).getTime(),
        moodValue: MOOD_VALUE[log.mood],
        mood: formatMoodLabel(log.mood),
        theme: log.theme,
        source: log.source,
      })),
    [logs],
  );

  return (
    <main className="dashboard-page history-page">
      <h1>Mood history</h1>
      <p className="subtitle">Theme switches logged by the extension and backend.</p>

      {!userId && (
        <p className="banner hint" role="status">
          Add <code>?userId=your-uuid</code> to the URL (same id as in the MoodCode extension).
        </p>
      )}

      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}

      <div className="actions range-toggle">
        <button
          type="button"
          className={`toggle ${days === 7 ? 'active' : ''}`}
          onClick={() => setDays(7)}
        >
          7 days
        </button>
        <button
          type="button"
          className={`toggle ${days === 30 ? 'active' : ''}`}
          onClick={() => setDays(30)}
        >
          30 days
        </button>
      </div>

      {loading && <p className="status">Loading history…</p>}

      {!loading && userId && chartData.length === 0 && (
        <p className="status">No mood switches in the last {days} days.</p>
      )}

      {!loading && chartData.length > 0 && (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="at"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) =>
                  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
                stroke="var(--text)"
              />
              <YAxis
                domain={[0.5, 4.5]}
                ticks={[1, 2, 3, 4]}
                tickFormatter={moodFromValue}
                stroke="var(--text)"
                width={88}
              />
              <Tooltip
                labelFormatter={(ts) => new Date(ts).toLocaleString()}
                formatter={(_value, _name, item) => {
                  const payload = item.payload as {
                    mood: string;
                    theme: string;
                    source: string;
                  };
                  return [`${payload.mood} · ${payload.theme} (${payload.source})`, 'Mood'];
                }}
              />
              <Line
                type="stepAfter"
                dataKey="moodValue"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent)' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </main>
  );
}
