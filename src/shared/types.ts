export interface Game {
	id: number;
	name: string;
	year?: number;
	imageId: string;
}

/** A search result: a Game plus details that help tell similar titles apart. */
export interface SearchResult extends Game {
	platforms: string[];
	/** Set for non-original releases, e.g. "Remake" or "Port". */
	kind?: string;
}

export const toGame = ({ id, name, year, imageId }: SearchResult): Game => ({
	id,
	name,
	imageId,
	...(year !== undefined && { year }),
});

export interface Grid {
	title: string;
	subtitle: string;
	slots: (Game | null)[];
}

export const LIMITS = { title: 60, subtitle: 100, name: 200 } as const;
