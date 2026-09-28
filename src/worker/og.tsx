import { env } from "cloudflare:workers";
import { cache, GoogleFont, ImageResponse } from "@cf-wasm/og/workerd";
import type { Grid } from "../shared/types.ts";

const INK = "#1f3a2c";
const CREAM = "#f8f3e3";
const TILE_W = 132;
const TILE_H = 185;
const GAP = 12;

async function coverDataUrl(imageId: string): Promise<string | null> {
	const res = await fetch(`https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`, {
		cf: { cacheEverything: true, cacheTtl: 31_536_000 },
	});
	if (!res.ok) return null;
	const bytes = new Uint8Array(await res.arrayBuffer());
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return `data:image/jpeg;base64,${btoa(binary)}`;
}

const titleSize = (title: string) => (title.length <= 16 ? 64 : title.length <= 30 ? 50 : 40);

/** 1200×630 link-preview image: title on the left, the 3×3 covers on the right. */
async function renderOgImage(grid: Grid, ctx: ExecutionContext): Promise<Response> {
	cache.setExecutionContext(ctx);
	const covers = await Promise.all(
		grid.slots.map((g) => (g ? coverDataUrl(g.imageId) : Promise.resolve(null))),
	);

	return ImageResponse.async(
		<div
			style={{
				display: "flex",
				width: "100%",
				height: "100%",
				padding: "36px 56px",
				alignItems: "center",
				justifyContent: "space-between",
				background: "linear-gradient(180deg, #d5e6d3 0%, #e7eedc 55%, #eef0e0 100%)",
				fontFamily: "Inter",
				color: INK,
			}}
		>
			<div style={{ display: "flex", flexDirection: "column", width: 560, gap: 20 }}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 10,
						padding: "28px 32px",
						borderRadius: 24,
						background: CREAM,
						border: "1px solid rgba(0,0,0,0.1)",
					}}
				>
					<div style={{ fontSize: titleSize(grid.title), fontWeight: 800, lineHeight: 1.1 }}>
						{grid.title}
					</div>
					{grid.subtitle && (
						<div style={{ fontSize: 26, fontWeight: 600, opacity: 0.7 }}>{grid.subtitle}</div>
					)}
				</div>
				<div style={{ display: "flex" }}>
					<div
						style={{
							padding: "8px 22px",
							borderRadius: 999,
							background: "rgba(248,243,227,0.85)",
							fontSize: 22,
							fontWeight: 800,
						}}
					>
						#My9Games
					</div>
				</div>
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", width: TILE_W * 3 + GAP * 2, gap: GAP }}>
				{covers.map((src, i) => (
					<div
						key={i}
						style={{
							display: "flex",
							width: TILE_W,
							height: TILE_H,
							borderRadius: 12,
							overflow: "hidden",
							border: `3px solid ${src ? INK : "rgba(31,58,44,0.2)"}`,
							background: src ? INK : "rgba(255,255,255,0.4)",
						}}
					>
						{src && (
							<img
								src={src}
								width={TILE_W - 6}
								height={TILE_H - 6}
								style={{ objectFit: "cover" }}
							/>
						)}
					</div>
				))}
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
			fonts: [
				new GoogleFont("Inter", { weight: 600 }),
				new GoogleFont("Inter", { weight: 800 }),
			],
			headers: { "Cache-Control": "public, max-age=31536000, immutable" },
		},
	);
}

/** Bump when the preview design changes; also busts crawler image caches. */
export const OG_VERSION = 2;

const objectKey = (id: string) => `v${OG_VERSION}/${id}.png`;

export const ogImagePath = (id: string) => `/api/og/${id}.png?v=${OG_VERSION}`;

/**
 * Rendering takes ~1s and a lot of CPU, which is too slow for crawlers that
 * fetch the image with a short timeout. So previews are rendered once, when
 * the poster is shared, and stored in R2.
 */
export async function ensureOgImage(id: string, grid: Grid, ctx: ExecutionContext) {
	const key = objectKey(id);
	const existing = await env.OG_IMAGES.get(key);
	if (existing) return existing.arrayBuffer();

	const png = await (await renderOgImage(grid, ctx)).arrayBuffer();
	await env.OG_IMAGES.put(key, png, { httpMetadata: { contentType: "image/png" } });
	return png;
}
