import { THEME_DEFAULTS, type MoodName, type TimeBracket } from '@moodcode/shared';
import { useConfig } from '../hooks/useConfig';
import { useUserIdFromQuery } from '../hooks/useUserId';
import { formatMoodLabel, MOOD_NAMES } from '../utils/mood';
import '../styles/dashboard-page.css';
import './BracketsPage.css';

function clampHour(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(23, Math.max(0, Math.round(value)));
}

interface BracketRowProps {
  bracket: TimeBracket;
  index: number;
  onChange: (index: number, patch: Partial<TimeBracket>) => void;
  onMoodChange: (index: number, mood: MoodName) => void;
}

function BracketRow({ bracket, index, onChange, onMoodChange }: BracketRowProps) {
  return (
    <tr>
      <td>
        <input
          type="number"
          min={0}
          max={23}
          value={bracket.start}
          aria-label={`Bracket ${index + 1} start hour`}
          onChange={(e) =>
            onChange(index, { start: clampHour(Number.parseInt(e.target.value, 10)) })
          }
        />
      </td>
      <td>
        <input
          type="number"
          min={0}
          max={23}
          value={bracket.end}
          aria-label={`Bracket ${index + 1} end hour`}
          onChange={(e) =>
            onChange(index, { end: clampHour(Number.parseInt(e.target.value, 10)) })
          }
        />
      </td>
      <td>
        <select
          value={bracket.mood}
          aria-label={`Bracket ${index + 1} mood`}
          onChange={(e) => onMoodChange(index, e.target.value as MoodName)}
        >
          {MOOD_NAMES.map((mood) => (
            <option key={mood} value={mood}>
              {formatMoodLabel(mood)}
            </option>
          ))}
        </select>
      </td>
      <td>
        <span className="theme-label">{bracket.theme}</span>
      </td>
    </tr>
  );
}

export default function BracketsPage() {
  const userId = useUserIdFromQuery();
  const { config, setConfig, loading, saving, error, save } = useConfig(userId);

  const updateBracket = (index: number, patch: Partial<TimeBracket>) => {
    setConfig((prev) => {
      if (!prev) {
        return prev;
      }
      const brackets = prev.brackets.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      );
      return { ...prev, brackets };
    });
  };

  const handleMoodChange = (index: number, mood: MoodName) => {
    if (!config) {
      return;
    }
    const theme = config.themeMappings[mood] ?? THEME_DEFAULTS[mood];
    updateBracket(index, { mood, theme });
  };

  const handleSave = async () => {
    try {
      await save();
    } catch {
      // error surfaced via hook state
    }
  };

  return (
    <main className="dashboard-page brackets-page">
      <h1>Time brackets</h1>
      <p className="subtitle">
        Define which mood applies for each hour range. Order matters — first match wins.
      </p>

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

      {loading && <p className="status">Loading config…</p>}

      {config && !loading && (
        <>
          <table className="brackets-table">
            <thead>
              <tr>
                <th scope="col">Start (hour)</th>
                <th scope="col">End (hour)</th>
                <th scope="col">Mood</th>
                <th scope="col">Theme</th>
              </tr>
            </thead>
            <tbody>
              {config.brackets.map((bracket, index) => (
                <BracketRow
                  key={index}
                  bracket={bracket}
                  index={index}
                  onChange={updateBracket}
                  onMoodChange={handleMoodChange}
                />
              ))}
            </tbody>
          </table>

          <div className="actions">
            <button
              type="button"
              className="primary"
              disabled={saving || !userId}
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {!saving && <span className="status">Pushes config to the extension via WebSocket.</span>}
          </div>
        </>
      )}
    </main>
  );
}
