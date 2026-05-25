import type { MoodName, GitSignalPayload } from '@moodcode/shared';
import { exec } from 'child_process';

/**
 * Runs a git command asynchronously inside the specified directory path.
 */
function runGitCommand(cmd: string, cwd: string): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(cmd, { cwd }, (error, stdout) => {
			if (error) {
				reject(error);
			} else {
				resolve(stdout);
			}
		});
	});
}

/**
 * Analyzes the last 20 git commits in the workspace to evaluate the developer's commit patterns.
 * Gracefully returns undefined if the directory is not a git repository or git is missing.
 */
export async function analyzeGitHistory(workspacePath: string): Promise<GitSignalPayload | undefined> {
	try {
		// Fetch the subject and unix timestamp of the last 20 commits
		const output = await runGitCommand('git log -n 20 --pretty=format:"%s|%at"', workspacePath);
		const lines = output.split('\n').map(line => line.trim()).filter(Boolean);
		if (lines.length === 0) {
			return undefined;
		}

		let revertCount = 0;
		let fixCount = 0;
		const now = Date.now();
		const parsedCommits: { subject: string; timestamp: number }[] = [];

		for (const line of lines) {
			const parts = line.split('|');
			const subject = parts[0] || '';
			const timestamp = parseInt(parts[1] || '0', 10);
			parsedCommits.push({ subject, timestamp });

			const subjectLower = subject.toLowerCase();
			if (subjectLower.includes('revert')) {
				revertCount++;
			}
			if (
				subjectLower.includes('fix') ||
				subjectLower.includes('bug') ||
				subjectLower.includes('hotfix') ||
				subjectLower.includes('resolve') ||
				subjectLower.includes('patch')
			) {
				fixCount++;
			}
		}

		const totalCommits = parsedCommits.length;
		const lastCommitTimeMs = (parsedCommits[0]?.timestamp ?? 0) * 1000;
		const oldestCommitTimeMs = (parsedCommits[totalCommits - 1]?.timestamp ?? 0) * 1000;

		const minutesSinceLastCommit = Math.max(0, (now - lastCommitTimeMs) / (1000 * 60));
		const durationHours = Math.max(0.1, (now - oldestCommitTimeMs) / (1000 * 60 * 60));

		const commitFrequency = totalCommits / durationHours;
		const revertRatio = revertCount / totalCommits;
		const fixCommitDensity = fixCount / totalCommits;

		return {
			commitFrequency,
			revertRatio,
			fixCommitDensity,
			minutesSinceLastCommit,
		};
	} catch (err) {
		console.warn('[MoodCode - Git] Failed to analyze git history. Workspace might not be a git repository.');
		return undefined;
	}
}

/**
 * Maps the Git signal payload to a VS Code editor MoodName.
 * Logs out the decision process clearly for debugging purposes.
 */
export function getMoodFromGit(payload: GitSignalPayload): MoodName {
	const { commitFrequency, revertRatio, fixCommitDensity, minutesSinceLastCommit } = payload;
	let calculatedMood: MoodName = 'post_lunch';

	// High reverts (>= 10%) + many fix commits (>= 25%) -> frustrated -> late_night
	if (revertRatio >= 0.1 && fixCommitDensity >= 0.25) {
		calculatedMood = 'late_night';
	}
	// High frequency (>= 1.5 commits/hour) + clean commits (no reverts, low fix density < 15%) -> flow -> deep_work
	else if (commitFrequency >= 1.5 && revertRatio === 0 && fixCommitDensity < 0.15) {
		calculatedMood = 'deep_work';
	}
	// Inactive for 2+ hours -> morning (fresh start/slow pace)
	else if (minutesSinceLastCommit > 120) {
		calculatedMood = 'morning';
	}
	// Default fallback -> post_lunch
	else {
		calculatedMood = 'post_lunch';
	}

	console.log(
		`[MoodCode - Git] Evaluated Git history:\n` +
		`  - Metrics: Frequency=${commitFrequency.toFixed(2)} commits/hr, Reverts=${(revertRatio * 100).toFixed(0)}%, Fixes=${(fixCommitDensity * 100).toFixed(0)}%, Inactive=${minutesSinceLastCommit.toFixed(0)} mins\n` +
		`  - Resulting Mood: ${calculatedMood}`
	);

	return calculatedMood;
}
