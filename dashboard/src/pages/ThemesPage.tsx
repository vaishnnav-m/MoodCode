import type { MoodName } from '@moodcode/shared';
import { useConfig } from '../hooks/useConfig';
import { useUserIdFromQuery } from '../hooks/useUserId';
import { formatMoodLabel, MOOD_NAMES } from '../utils/mood';
import '../styles/dashboard-page.css';

export default function ThemesPage() {
  const userId = useUserIdFromQuery();
  const { config, setConfig, loading, saving, error, save } = useConfig(userId);

  const updateThemeMapping = (mood: MoodName, theme: string) => {
    setConfig((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        themeMappings: { ...prev.themeMappings, [mood]: theme },
      };
    });
  };

  const handleSave = async () => {
    if (!config) {
      return;
    }
    const synced = {
      ...config,
      brackets: config.brackets.map((row) => ({
        ...row,
        theme: config.themeMappings[row.mood],
      })),
    };
    try {
      await save(synced);
    } catch {
      // error surfaced via hook state
    }
  };

  return (
    <main className="dashboard-page themes-page">
      <h1>Theme mappings</h1>
      <p className="subtitle">
        Map each mood to a VS Code theme name (must match an installed theme exactly).
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
          <table className="dashboard-form-table">
            <thead>
              <tr>
                <th scope="col">Mood</th>
                <th scope="col">VS Code theme</th>
              </tr>
            </thead>
            <tbody>
              {MOOD_NAMES.map((mood) => (
                <tr key={mood}>
                  <td>{formatMoodLabel(mood)}</td>
                  <td>
                    <input
                      type="text"
                      value={config.themeMappings[mood]}
                      aria-label={`${formatMoodLabel(mood)} theme`}
                      onChange={(e) => updateThemeMapping(mood, e.target.value)}
                    />
                  </td>
                </tr>
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
          </div>
        </>
      )}
    </main>
  );
}
