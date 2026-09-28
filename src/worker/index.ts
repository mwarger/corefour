import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { CATEGORIES, isCategoryId, subtitleText } from "../shared/catalog.ts";
import { loadGrid, resolveGrid, saveGrid, ShareBusyError, UnknownItemError } from "./grids.ts";
import { ensureOgImage, ogImagePath } from "./og.tsx";
import { isImageSize, isSourceId, SOURCES } from "./sources/index.ts";
import { verifyTurnstile } from "./turnstile.ts";
import { parseShareRequest } from "./validate.ts";

const app = new Hono();
const api = new Hono();

// Bump when search result shape or ranking changes to bypass stale cache.
const SEARCH_CACHE_VERSION = 5;

// Hono's ExecutionContext type lags behind workerd's.
const ctxOf = (c: { executionCtx: unknown }) => c.executionCtx as ExecutionContext;

api.get("/health", (c) => c.json({ ok: true }));

// Responses are cached per-colo with the Cache API so repeat searches
// don't hit the source API (and don't spend KV writes).
api.get("/search", async (c) => {
	const category = c.req.query("category") ?? "games";
	if (!isCategoryId(category)) return c.json({ error: "Unknown category" }, 400);
	const q = (c.req.query("q") ?? "").trim().toLowerCase();
	if (q.length < 2) return c.json([]);

	const cache = await caches.open("search");
	const cacheKey = new Request(
		`https://cache.my9/search/v${SEARCH_CACHE_VERSION}/${category}?q=${encodeURIComponent(q)}`,
	);
	const hit = await cache.match(cacheKey);
	if (hit) return hit;

	const results = await SOURCES[CATEGORIES[category].source].search(q);
	const res = Response.json(results, {
		headers: { "Cache-Control": "public, max-age=86400" },
	});
	c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));
	return res;
});

// Same-origin image proxy so the poster can be exported to PNG without
// tainting the canvas. Only fetches from each source's own image host.
api.get("/img/:source/:size/:key", async (c) => {
	const { source, size, key } = c.req.param();
	if (!isSourceId(source) || !isImageSize(size)) return c.notFound();
	const url = SOURCES[source].imageUrl(size, key);
	if (!url) return c.notFound();

	const upstream = await fetch(url, { cf: { cacheEverything: true, cacheTtl: 31_536_000 } });
	if (!upstream.ok) return c.notFound();

	return new Response(upstream.body, {
		headers: {
			"Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
});

api.post("/grids", async (c) => {
	const req = parseShareRequest(await c.req.json().catch(() => null));
	if (!req) return c.json({ error: "Invalid poster" }, 400);

	const ip = c.req.header("CF-Connecting-IP");
	const { success } = await env.SHARE_LIMITER.limit({ key: ip ?? "unknown" });
	if (!success) return c.json({ error: "Too many shares. Try again in a minute." }, 429);
	if (!(await verifyTurnstile(req.turnstileToken, ip))) {
		return c.json({ error: "Couldn't verify you're human. Please try again." }, 403);
	}

	try {
		const grid = await resolveGrid(req);
		const id = await saveGrid(grid);
		c.executionCtx.waitUntil(ensureOgImage(id, grid, ctxOf(c)));
		return c.json({ id }, 201);
	} catch (err) {
		if (err instanceof UnknownItemError) return c.json({ error: "Invalid poster" }, 400);
		if (err instanceof ShareBusyError) {
			return c.json({ error: "Sharing is busy right now. Try again later." }, 503);
		}
		throw err;
	}
});

// Grids are immutable (content-addressed), so they can be cached forever.
api.get("/grids/:id", async (c) => {
	const grid = await loadGrid(c.req.param("id"));
	if (!grid) return c.json({ error: "Not found" }, 404);
	return c.json(grid, 200, { "Cache-Control": "public, max-age=31536000, immutable" });
});

// Link-preview image, normally pre-rendered to R2 when the poster was shared.
api.get("/og/:file", async (c) => {
	const id = c.req.param("file").match(/^([0-9A-Za-z]{10})\.png$/)?.[1];
	if (!id) return c.notFound();

	const grid = await loadGrid(id);
	if (!grid) return c.notFound();
	const png = await ensureOgImage(id, grid, ctxOf(c));
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
	const [page, grid] = await Promise.all([
		env.ASSETS.fetch(new URL("/", c.req.url)),
		loadGrid(id),
	]);
	if (!grid) return page;

	const names = grid.items.flatMap((i) => (i ? [i.name] : []));
	const heading = CATEGORIES[grid.category].title;
	const subtitle = subtitleText(grid.category, grid.subtitle) ?? "";
	const title = escapeHtml(heading);
	const description = escapeHtml(names.join(" · "));
	const alt = escapeHtml(`${heading}, ${subtitle}: ${names.join(", ")}`);
	const image = escapeHtml(new URL(ogImagePath(id), c.req.url).href);
	const url = escapeHtml(new URL(`/g/${id}`, c.req.url).href);
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
		.on("title", { element: (el) => void el.setInnerContent(heading) })
		// Tags go first so crawlers that only read the first chunk see them.
		.on("head", { element: (el) => void el.prepend(meta, { html: true }) })
		.transform(page);
});

// Hono routes every notFound (including c.notFound() inside the api sub-app)
// here: API paths get a JSON 404, everything else falls through to the SPA.
app.notFound((c) =>
	new URL(c.req.url).pathname.startsWith("/api/")
		? c.json({ error: "Not found" }, 404)
		: env.ASSETS.fetch(c.req.raw),
);

export default app satisfies ExportedHandler;
