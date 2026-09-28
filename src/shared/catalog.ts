/**
 * Everything a poster can say comes from this file or from a source database
 * (IGDB, ...). There is deliberately no free text: titles are fixed per
 * category and subtitles are picked from presets.
 */

export type SourceId = "igdb";

export const SOURCE_ID_PATTERNS: Record<SourceId, RegExp> = {
	igdb: /^\d{1,10}$/,
};

export interface Category {
	title: string;
	hashtag: string;
	/** Singular noun for UI copy, e.g. "Search for game #3". */
	noun: string;
	source: SourceId;
	subtitles: { id: string; text: string }[];
}

export const CATEGORIES = {
	games: {
		title: "My Core Four",
		hashtag: "#CoreFour",
		noun: "game",
		source: "igdb",
		subtitles: [
			{ id: "shaped", text: "The 4 Games That Shaped Who I Am" },
			{ id: "favorites", text: "My All-Time Favorites" },
			{ id: "desert-island", text: "Desert Island Picks" },
			{ id: "comfort", text: "My Comfort Games" },
			{ id: "raised-me", text: "The Games That Raised Me" },
			{ id: "replay", text: "Games I Could Replay Forever" },
			{ id: "underrated", text: "Underrated Gems" },
			{ id: "best-ever", text: "The Best Games Ever Made" },
		],
	},
} as const satisfies Record<string, Category>;

export type CategoryId = keyof typeof CATEGORIES;

export const THEMES = [{ id: "sage", name: "Sage" }] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const isCategoryId = (v: unknown): v is CategoryId =>
	typeof v === "string" && Object.hasOwn(CATEGORIES, v);

export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

export function subtitleText(category: CategoryId, subtitleId: string): string | undefined {
	return (CATEGORIES[category].subtitles as readonly { id: string; text: string }[]).find(
		(s) => s.id === subtitleId,
	)?.text;
}
