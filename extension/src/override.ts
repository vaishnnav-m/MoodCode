import type { MoodName } from '@moodcode/shared';

export const OVERRIDE_DURATION_HOURS = [1, 2, 4] as const;
export type OverrideDurationHours = (typeof OVERRIDE_DURATION_HOURS)[number];

export interface ActiveOverride {
	mood: MoodName;
	expiresAt: number;
}

export interface OverrideManager {
	set(mood: MoodName, hours: OverrideDurationHours): void;
	clear(): void;
	getActive(): ActiveOverride | undefined;
	/** When true, the time-based polling loop should skip re-evaluation. */
	isActive(): boolean;
}

const MS_PER_HOUR = 60 * 60 * 1000;

export function createOverrideManager(): OverrideManager {
	let active: ActiveOverride | undefined;

	function pruneExpired(): void {
		if (active && Date.now() >= active.expiresAt) {
			active = undefined;
		}
	}

	return {
		set(mood, hours) {
			active = {
				mood,
				expiresAt: Date.now() + hours * MS_PER_HOUR,
			};
		},
		clear() {
			active = undefined;
		},
		getActive() {
			pruneExpired();
			return active;
		},
		isActive() {
			pruneExpired();
			return active !== undefined;
		},
	};
}
