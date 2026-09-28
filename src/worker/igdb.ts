import { env } from "cloudflare:workers";
import type { SearchResult } from "../shared/types.ts";

const TOKEN_KEY = "igdb:token";

async function getToken(): Promise<string> {
	const cached = await env.KV.get(TOKEN_KEY);
	if (cached) return cached;

	const res = await fetch("https://id.twitch.tv/oauth2/token", {
		method: "POST",
		body: new URLSearchParams({
			client_id: env.IGDB_CLIENT_ID,
			client_secret: env.IGDB_CLIENT_SECRET,
			grant_type: "client_credentials",
		}),
	});
	if (!res.ok) throw new Error(`Twitch token request failed: ${res.status}`);
	const { access_token, expires_in } = (await res.json()) as {
		access_token: string;
		expires_in: number;
	};
	// Refresh a day early; tokens last ~60 days.
	await env.KV.put(TOKEN_KEY, access_token, {
		expirationTtl: Math.max(60, expires_in - 86_400),
	});
	return access_token;
}

interface IgdbGame {
	id: number;
	name: string;
	first_release_date?: number;
	cover?: { image_id: string };
	total_rating_count?: number;
	platforms?: { name: string; abbreviation?: string }[];
	game_type?: number;
}

// IGDB game_type ids we search (0 = main game, which gets no label).
const KIND_LABELS: Record<number, string> = {
	8: "Remake",
	9: "Remaster",
	10: "Expanded",
	11: "Port",
};

export async function searchGames(query: string): Promise<SearchResult[]> {
	// IGDB's query language uses double quotes and semicolons as syntax.
	const q = query.replace(/["\;]/g, " ").trim().slice(0, 80);
	if (!q) return [];

	const res = await fetch("https://api.igdb.com/v4/games", {
		method: "POST",
		headers: {
			"Client-ID": env.IGDB_CLIENT_ID,
			Authorization: `Bearer ${await getToken()}`,
		},
		body: `search "${q}"; fields name,first_release_date,cover.image_id,total_rating_count,platforms.name,platforms.abbreviation,game_type; where cover != null & version_parent = null & game_type = (0,8,9,10,11); limit 30;`,
	});
	if (res.status === 401) await env.KV.delete(TOKEN_KEY);
	if (!res.ok) throw new Error(`IGDB search failed: ${res.status}`);

	// IGDB's text relevance happily ranks fan projects and obscure ports first.
	// Prefer titles that contain every query word, then the well-known release
	// by rating count. Array#sort is stable, so ties keep IGDB's order.
	const games = ((await res.json()) as IgdbGame[])
		.map((g) => ({ g, tier: matchTier(g.name, q), count: g.total_rating_count ?? 0 }))
		.sort((a, b) => a.tier - b.tier || b.count - a.count)
		.slice(0, 20)
		.map(({ g }) => g);
	return games.map((g) => ({
		id: g.id,
		name: g.name,
		year: g.first_release_date
			? new Date(g.first_release_date * 1000).getUTCFullYear()
			: undefined,
		imageId: g.cover!.image_id,
		platforms: (g.platforms ?? []).map((p) => p.abbreviation ?? p.name),
		kind: g.game_type === undefined ? undefined : KIND_LABELS[g.game_type],
	}));
}

const words = (s: string): string[] => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

function matchTier(name: string, query: string): number {
	const nameWords = words(name);
	const queryWords = words(query);
	if (nameWords.join(" ") === queryWords.join(" ")) return 0;
	return queryWords.every((w) => nameWords.includes(w)) ? 1 : 2;
}
