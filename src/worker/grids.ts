import { env } from "cloudflare:workers";
import { type Game, type Grid, LIMITS } from "../shared/types.ts";

const isStr = (v: unknown, max: number): v is string =>
	typeof v === "string" && v.length <= max;

function parseGame(v: unknown): Game | null | undefined {
	if (v === null) return null;
	if (typeof v !== "object") return undefined;
	const g = v as Record<string, unknown>;
	if (
		!Number.isSafeInteger(g.id) ||
		!isStr(g.name, LIMITS.name) ||
		typeof g.imageId !== "string" ||
		!/^[a-z0-9]{1,32}$/.test(g.imageId) ||
		(g.year !== undefined && !Number.isSafeInteger(g.year))
	) {
		return undefined;
	}
	return {
		id: g.id as number,
		name: g.name,
		imageId: g.imageId,
		...(g.year !== undefined && { year: g.year as number }),
	};
}

/** Validates untrusted input and rebuilds it with only known fields. */
export function parseGrid(v: unknown): Grid | null {
	if (typeof v !== "object" || v === null) return null;
	const g = v as Record<string, unknown>;
	if (!isStr(g.title, LIMITS.title) || !isStr(g.subtitle, LIMITS.subtitle)) return null;
	if (!Array.isArray(g.slots) || g.slots.length !== 9) return null;
	const slots = g.slots.map(parseGame);
	if (slots.includes(undefined) || slots.every((s) => s === null)) return null;
	return { title: g.title, subtitle: g.subtitle, slots: slots as (Game | null)[] };
}

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Content-addressed IDs: sharing the same poster twice returns the same link
// and skips the KV write (free tier allows 1k writes/day).
async function gridId(json: string): Promise<string> {
	const hash = new Uint8Array(
		await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json)),
	);
	return Array.from(hash.slice(0, 10), (b) => ALPHABET[b % 62]).join("");
}

export async function saveGrid(grid: Grid): Promise<string> {
	const json = JSON.stringify(grid);
	const id = await gridId(json);
	const key = `grid:${id}`;
	if ((await env.KV.get(key)) === null) await env.KV.put(key, json);
	return id;
}

export async function loadGrid(id: string): Promise<string | null> {
	if (!/^[0-9A-Za-z]{10}$/.test(id)) return null;
	return env.KV.get(`grid:${id}`, { cacheTtl: 86_400 });
}
