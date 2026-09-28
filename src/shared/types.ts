import type { CategoryId, SourceId, ThemeId } from "./catalog.ts";

/** One pick on a poster. Names and images always come from the source database. */
export interface Item {
	source: SourceId;
	id: string;
	name: string;
	year?: number;
	/** Source-specific image key, served via /api/img/:source/:size/:image. */
	image: string;
}

/** A search result: an Item plus details that help tell similar titles apart. */
export interface SearchResult extends Item {
	platforms: string[];
	/** Set for non-original releases, e.g. "Remake" or "Port". */
	kind?: string;
}

export const toItem = ({ source, id, name, year, image }: Item): Item => ({
	source,
	id,
	name,
	image,
	...(year !== undefined && { year }),
});

export const GRID_SIZE = 4;

export interface Grid {
	v: 2;
	category: CategoryId;
	subtitle: string;
	theme: ThemeId;
	items: (Item | null)[];
}

export type ItemRef = Pick<Item, "source" | "id">;

/** Sharing sends references only; the server resolves names and images. */
export interface ShareRequest {
	category: CategoryId;
	subtitle: string;
	theme: ThemeId;
	items: (ItemRef | null)[];
	turnstileToken: string;
}
