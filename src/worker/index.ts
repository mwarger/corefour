import { Hono } from "hono";
import { loadGrid, parseGrid, saveGrid } from "./grids.ts";
import { searchGames } from "./igdb.ts";

const app = new Hono().basePath("/api");

// Bump when search result shape or ranking changes to bypass stale cache.
const SEARCH_CACHE_VERSION = 3;

app.get("/health", (c) => c.json({ ok: true }));

// Responses are cached per-colo with the Cache API so repeat searches
// don't hit IGDB (and don't spend KV writes).
app.get("/search", async (c) => {
	const q = (c.req.query("q") ?? "").trim().toLowerCase();
	if (q.length < 2) return c.json([]);

	const cache = await caches.open("search");
	const cacheKey = new Request(`https://cache.my9/search/v${SEARCH_CACHE_VERSION}?q=${encodeURIComponent(q)}`);
	const hit = await cache.match(cacheKey);
	if (hit) return hit;

	const res = Response.json(await searchGames(q), {
		headers: { "Cache-Control": "public, max-age=86400" },
	});
	c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));
	return res;
});

const IMAGE_SIZES = new Set(["cover_small", "cover_big", "cover_big_2x", "720p"]);

// Same-origin proxy for IGDB covers so the poster can be exported to PNG
// without tainting the canvas.
app.get("/img/:size/:imageId", async (c) => {
	const { size, imageId } = c.req.param();
	if (!IMAGE_SIZES.has(size) || !/^[a-z0-9]+$/.test(imageId)) {
		return c.notFound();
	}

	const upstream = await fetch(
		`https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`,
		{ cf: { cacheEverything: true, cacheTtl: 31_536_000 } },
	);
	if (!upstream.ok) return c.notFound();

	return new Response(upstream.body, {
		headers: {
			"Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
});

app.post("/grids", async (c) => {
	const grid = parseGrid(await c.req.json().catch(() => null));
	if (!grid) return c.json({ error: "Invalid poster" }, 400);
	return c.json({ id: await saveGrid(grid) }, 201);
});

// Grids are immutable (content-addressed), so they can be cached forever.
app.get("/grids/:id", async (c) => {
	const json = await loadGrid(c.req.param("id"));
	if (!json) return c.json({ error: "Not found" }, 404);
	return c.body(json, 200, {
		"Content-Type": "application/json",
		"Cache-Control": "public, max-age=31536000, immutable",
	});
});

app.onError((err, c) => {
	console.error(err);
	return c.json({ error: "Something went wrong" }, 500);
});

export default app satisfies ExportedHandler;
