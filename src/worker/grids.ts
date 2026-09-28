import { env } from "cloudflare:workers";
import { normalizeGrid } from "../shared/draft.ts";
import type { Grid, ShareRequest } from "../shared/types.ts";
import { GRID_ID_PATTERN, gridId } from "./ids.ts";
import { SOURCES } from "./sources/index.ts";

/** Thrown when an item reference doesn't resolve in its source database. */
export class UnknownItemError extends Error {}

/** Thrown when KV's daily write quota is exhausted. */
export class ShareBusyError extends Error {}

/** Builds the stored grid from references, taking names and images from the source. */
export async function resolveGrid(req: ShareRequest): Promise<Grid> {
	const ids = req.items.flatMap((i) => (i ? [i.id] : []));
	const found = await SOURCES.igdb.lookup([...new Set(ids)]);
	const items = req.items.map((ref) => {
		if (!ref) return null;
		const item = found.get(ref.id);
		if (!item) throw new UnknownItemError(`Unknown ${ref.source} item ${ref.id}`);
		return item;
	});
	return { v: 2, category: req.category, subtitle: req.subtitle, theme: req.theme, items };
}

export async function saveGrid(grid: Grid): Promise<string> {
	const json = JSON.stringify(grid);
	const id = await gridId(json);
	const key = `grid:${id}`;
	if ((await env.KV.get(key)) === null) {
		try {
			await env.KV.put(key, json);
		} catch (err) {
			if (err instanceof Error && /limit/i.test(err.message)) throw new ShareBusyError();
			throw err;
		}
	}
	return id;
}

export async function loadGrid(id: string): Promise<Grid | null> {
	if (!GRID_ID_PATTERN.test(id)) return null;
	const stored = await env.KV.get(`grid:${id}`, { type: "json", cacheTtl: 86_400 });
	return stored === null ? null : normalizeGrid(stored);
}
