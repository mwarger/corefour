import { env } from "cloudflare:workers";
import { Hono } from "hono";
import type { Grid } from "../shared/types.ts";
import { loadGrid, parseGrid, saveGrid } from "./grids.ts";
import { searchGames } from "./igdb.ts";
import { ensureOgImage, ogImagePath } from "./og.tsx";

const app = new Hono();
const api = new Hono();

// Bump when search result shape or ranking changes to bypass stale cache.
const SEARCH_CACHE_VERSION = 3;

api.get("/health", (c) => c.json({ ok: true }));

// Responses are cached per-colo with the Cache API so repeat searches
// don't hit IGDB (and don't spend KV writes).
api.get("/search", async (c) => {
	const q = (c.req.query("q") ?? "").trim().toLowerCase();
	if (q.length < 2) return c.json([]);

	const cache = await caches.open("search");
	const cacheKey = new Request(
		`https://cache.my9/search/v${SEARCH_CACHE_VERSION}?q=${encodeURIComponent(q)}`,
	);
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
api.get("/img/:size/:imageId", async (c) => {
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

api.post("/grids", async (c) => {
	const grid = parseGrid(await c.req.json().catch(() => null));
	if (!grid) return c.json({ error: "Invalid poster" }, 400);
	const id = await saveGrid(grid);
	c.executionCtx.waitUntil(ensureOgImage(id, grid, c.executionCtx as ExecutionContext));
	return c.json({ id }, 201);
});

// Grids are immutable (content-addressed), so they can be cached forever.
api.get("/grids/:id", async (c) => {
	const json = await loadGrid(c.req.param("id"));
	if (!json) return c.json({ error: "Not found" }, 404);
	return c.body(json, 200, {
		"Content-Type": "application/json",
		"Cache-Control": "public, max-age=31536000, immutable",
	});
});

// Link-preview image, normally pre-rendered to R2 when the poster was shared.
api.get("/og/:file", async (c) => {
	const id = c.req.param("file").match(/^([0-9A-Za-z]{10})\.png$/)?.[1];
	if (!id) return c.notFound();

	const json = await loadGrid(id);
	if (!json) return c.notFound();
	const png = await ensureOgImage(
		id,
		JSON.parse(json) as Grid,
		// Hono's ExecutionContext type lags behind workerd's.
		c.executionCtx as ExecutionContext,
	);
	return c.body(png, 200, {
		"Content-Type": "image/png",
		"Cache-Control": "public, max-age=31536000, immutable",
	});
});

api.onError((err, c) => {
	console.error(err);
	return c.json({ error: "Something went wrong" }, 500);
});

app.route("/api", api);

const escapeHtml = (s: string) =>
	s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

// Shared posters get the SPA shell plus Open Graph tags, so links unfurl
// with a preview image in chat apps and social sites.
app.get("/g/:id", async (c) => {
	const id = c.req.param("id");
	const [page, json] = await Promise.all([
		env.ASSETS.fetch(new URL("/", c.req.url)),
		loadGrid(id),
	]);
	if (!json) return page;

	const grid = JSON.parse(json) as Grid;
	const games = grid.slots.flatMap((g) => (g ? [g.name] : []));
	const title = escapeHtml(grid.title);
	const description = escapeHtml(games.join(" · "));
	const image = escapeHtml(new URL(ogImagePath(id), c.req.url).href);
	const url = escapeHtml(new URL(`/g/${id}`, c.req.url).href);
	const alt = escapeHtml(`${grid.title}: ${games.join(", ")}`);
	const meta = `
		<meta name="description" content="${description}" />
		<meta property="og:type" content="website" />
		<meta property="og:site_name" content="My 9" />
		<meta property="og:title" content="${title}" />
		<meta property="og:description" content="${description}" />
		<meta property="og:url" content="${url}" />
		<meta property="og:image" content="${image}" />
		<meta property="og:image:type" content="image/png" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:image:alt" content="${alt}" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content="${title}" />
		<meta name="twitter:description" content="${description}" />
		<meta name="twitter:image" content="${image}" />
		<meta name="twitter:image:alt" content="${alt}" />`;

	return new HTMLRewriter()
		.on("title", { element: (el) => void el.setInnerContent(grid.title) })
		.on("head", { element: (el) => void el.prepend(meta, { html: true }) })
		.transform(page);
});

app.notFound((c) => env.ASSETS.fetch(c.req.raw));

export default app satisfies ExportedHandler;
