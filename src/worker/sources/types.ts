import type { Item, SearchResult } from "../../shared/types.ts";

export type ImageSize = "thumb" | "cover" | "og";

export interface Source {
	search(query: string): Promise<SearchResult[]>;
	/** Resolves IDs (already validated against SOURCE_ID_PATTERNS) to canonical items. */
	lookup(ids: string[]): Promise<Map<string, Item>>;
	/** Upstream image URL, or null if the key isn't valid for this source. */
	imageUrl(size: ImageSize, key: string): string | null;
}
