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
	// v1 drafts stored IGDB games as { id: number, name, year, imageId }.
	if (typeof v.imageId === "string" && typeof v.id === "number") {
		v = { source: "igdb", id: String(v.id), name: v.name, year: v.year, image: v.imageId };
	}
	const i = v as Record<string, unknown>;
	if (
		i.source !== "igdb" ||
		typeof i.id !== "string" ||
		typeof i.name !== "string" ||
		typeof i.image !== "string"
	) {
		return null;
	}
	return {
		source: i.source,
		id: i.id,
		name: i.name,
		image: i.image,
		...(typeof i.year === "number" && { year: i.year }),
	};
}

/**
 * Turns whatever is in localStorage into a valid draft, upgrading v1 drafts
 * (free-text title/subtitle, `slots`) and dropping anything unrecognized.
 */
export function migrateDraft(raw: unknown): Grid {
	const grid = emptyGrid();
	if (!isObject(raw)) return grid;

	const slots = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.slots) ? raw.slots : [];
	grid.items = Array.from({ length: GRID_SIZE }, (_, i) => itemFrom(slots[i]));

	if (raw.v === 2) {
		if (isCategoryId(raw.category)) grid.category = raw.category;
		if (typeof raw.subtitle === "string" && subtitleText(grid.category, raw.subtitle)) {
			grid.subtitle = raw.subtitle;
		}
		if (isThemeId(raw.theme)) grid.theme = raw.theme;
	}
	return grid;
}
