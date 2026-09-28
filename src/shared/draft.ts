import { CATEGORIES, isCategoryId, isThemeId, subtitleText } from "./catalog.ts";
import { GRID_SIZE, type Grid, type Item } from "./types.ts";

export const emptyGrid = (): Grid => ({
	v: 2,
	category: "games",
	subtitle: CATEGORIES.games.subtitles[0].id,
	theme: "sage",
	items: Array(GRID_SIZE).fill(null),
});

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null;

function itemFrom(v: unknown): Item | null {
	if (!isObject(v)) return null;
	const { source, id, name, image, year } = v;
	if (
		source !== "igdb" ||
		typeof id !== "string" ||
		typeof name !== "string" ||
		typeof image !== "string"
	) {
		return null;
	}
	return { source, id, name, image, ...(typeof year === "number" && { year }) };
}

/**
 * Turns untrusted stored data (localStorage, cached API responses) into a
 * valid grid, resetting unknown presets and dropping unrecognized items.
 */
export function normalizeGrid(raw: unknown): Grid {
	const grid = emptyGrid();
	if (!isObject(raw)) return grid;

	const items = Array.isArray(raw.items) ? raw.items : [];
	grid.items = Array.from({ length: GRID_SIZE }, (_, i) => itemFrom(items[i]));
	if (isCategoryId(raw.category)) grid.category = raw.category;
	if (typeof raw.subtitle === "string" && subtitleText(grid.category, raw.subtitle)) {
		grid.subtitle = raw.subtitle;
	}
	if (isThemeId(raw.theme)) grid.theme = raw.theme;
	return grid;
}
