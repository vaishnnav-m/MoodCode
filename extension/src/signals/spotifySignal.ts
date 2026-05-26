import type { MoodName, SpotifySignalPayload } from '@moodcode/shared';

/**
 * Maps artist genres to a target developer mood.
 */
function getMoodFromGenres(genres: string[]): MoodName | undefined {
	const genresStr = genres.join(' ').toLowerCase();

	// 1. deep_work (Synthwave, Techno, House, Rock, Metal, Focus/study electronica)
	if (
		genresStr.includes('synthwave') ||
		genresStr.includes('techno') ||
		genresStr.includes('house') ||
		genresStr.includes('rock') ||
		genresStr.includes('metal') ||
		genresStr.includes('prog') ||
		genresStr.includes('focus') ||
		genresStr.includes('drum and bass') ||
		genresStr.includes('dnb')
	) {
		return 'deep_work';
	}

	// 2. late_night (Ambient, Lofi, Chill, Jazz, Blues, Classical, Melancholic/Slow)
	if (
		genresStr.includes('ambient') ||
		genresStr.includes('lofi') ||
		genresStr.includes('chill') ||
		genresStr.includes('jazz') ||
		genresStr.includes('blues') ||
		genresStr.includes('classical') ||
		genresStr.includes('downtempo') ||
		genresStr.includes('sleep')
	) {
		return 'late_night';
	}

	// 3. morning (Acoustic, Folk, Singer-songwriter, Gentle, Morning)
	if (
		genresStr.includes('acoustic') ||
		genresStr.includes('folk') ||
		genresStr.includes('singer-songwriter') ||
		genresStr.includes('morning') ||
		genresStr.includes('country') ||
		genresStr.includes('indie folk')
	) {
		return 'morning';
	}

	// 4. post_lunch (Pop, Hip Hop, Rap, R&B, Funk, Soul, Dance)
	if (
		genresStr.includes('pop') ||
		genresStr.includes('hip hop') ||
		genresStr.includes('rap') ||
		genresStr.includes('r&b') ||
		genresStr.includes('soul') ||
		genresStr.includes('funk') ||
		genresStr.includes('dance')
	) {
		return 'post_lunch';
	}

	return undefined;
}

/**
 * Evaluates the Spotify signal payload and maps it to a VS Code editor MoodName.
 * Logs out the decision process clearly for debugging purposes.
 */
export function getMoodFromSpotify(payload: SpotifySignalPayload): MoodName | undefined {
	if (!payload.isPlaying) {
		console.log('[MoodCode - Spotify] Player is inactive or paused. Skipping Spotify signal evaluation.');
		return undefined;
	}

	const trackName = payload.trackName || '';
	const albumName = payload.albumName || '';
	const isExplicit = payload.isExplicit || false;

	let calculatedMood: MoodName = 'post_lunch';
	let source = 'fallback';

	const trackLower = trackName.toLowerCase();
	const albumLower = albumName.toLowerCase();

	// 1. Direct metadata keyword classification (High vs. Soft vibes)
	if (
		trackLower.includes('theme') || 
		albumLower.includes('score') || 
		albumLower.includes('instrumental') ||
		trackLower.includes('lofi') ||
		trackLower.includes('lo-fi') ||
		trackLower.includes('ambient')
	) {
		// Soft background track -> Map to late_night / Dracula
		calculatedMood = 'late_night';
		source = 'metadata (soft background track)';
	} 
	else if (
		isExplicit || 
		trackLower.includes('remix') || 
		trackLower.includes('dj') ||
		trackLower.includes('rap') ||
		trackLower.includes('hip hop')
	) {
		// High vibe track -> Map to deep_work / Tokyo Night
		calculatedMood = 'deep_work';
		source = 'metadata (high vibe track)';
	}
	// 2. Prioritize genre-based mapping if available and wasn't resolved by metadata
	else if (payload.genres && payload.genres.length > 0) {
		const genreMood = getMoodFromGenres(payload.genres);
		if (genreMood) {
			calculatedMood = genreMood;
			source = `genres (${payload.genres.slice(0, 3).join(', ')})`;
		}
	}

	// 3. Fallback to numeric features if genre and metadata didn't yield a match or weren't provided
	if (source === 'fallback') {
		const { energy, valence, tempo, acousticness } = payload;
		
		// High energy + high valence + fast tempo -> deep_work
		if (energy >= 0.7 && valence >= 0.6 && tempo >= 120) {
			calculatedMood = 'deep_work';
			source = 'audio features (energetic)';
		}
		// Low energy + low valence + slow tempo -> late_night
		else if (energy < 0.4 && valence < 0.4 && tempo < 95) {
			calculatedMood = 'late_night';
			source = 'audio features (slow/calm)';
		}
		// High acousticness + medium/high valence -> morning
		else if (acousticness >= 0.6 && valence >= 0.3) {
			calculatedMood = 'morning';
			source = 'audio features (acoustic)';
		}
		// Default fallback -> post_lunch
		else {
			calculatedMood = 'post_lunch';
			source = 'audio features (default fallback)';
		}
	}

	console.log(
		`[MoodCode - Spotify] Evaluated active playback:\n` +
		`  - Track: "${trackName}" from album "${albumName}" (Explicit: ${isExplicit})\n` +
		`  - Source: ${source}\n` +
		`  - Resulting Mood: ${calculatedMood}`
	);

	return calculatedMood;
}
