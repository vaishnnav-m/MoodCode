/** Named moods used across extension, backend, and dashboard (MVP: time brackets only). */
export type MoodName = 'morning' | 'deep_work' | 'post_lunch' | 'late_night';

/** Resolved mood shown in the status bar and used to pick the VS Code theme. */
export interface MoodState {
  mood: MoodName;
  /** Active VS Code theme id / name from workbench.colorTheme. */
  theme: string;
  /** `time` = from brackets; `override` = user-pinned mood. */
  source: 'time' | 'override';
  /** Unix ms when this state was last computed. */
  updatedAt: number;
  /** When `source` is `override`, Unix ms when the pin expires (unset otherwise). */
  overrideExpiresAt?: number;
}
