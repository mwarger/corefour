import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as RemovalPolicy from "alchemy/RemovalPolicy";
import { Stack } from "alchemy/Stack";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

const isProd = (stage: string) => stage === "prod";
const isLocalDev = (stage: string) => stage.startsWith("dev_");

const inProd = Effect.gen(function* () {
	return isProd((yield* Stack).stage);
});

// Shared posters (grid:{id}) and the IGDB token cache. Kept if the stack is
// ever destroyed in prod, since it holds user data.
export const Kv = Cloudflare.KV.Namespace("Kv").pipe(RemovalPolicy.retain(inProd));

// Pre-rendered link-preview images (derived from Kv, safe to rebuild).
export const OgImages = Cloudflare.R2.Bucket("OgImages");

export const ShareLimiter = Cloudflare.RateLimit("ShareLimiter", {
	namespaceId: 1001,
	simple: { limit: 10, period: 60 },
});

export const Website = Cloudflare.Website.Vite(
	"Website",
	Stack.useSync((stack) => ({
		// Physical name sets the URL: corefour.<subdomain>.workers.dev in prod;
		// other stages get generated names.
		...(isProd(stack.stage) && { name: "corefour" }),
		main: "src/worker/index.ts",
		// Newest date supported by the workerd bundled with alchemy (for `alchemy dev`).
		compatibility: { date: "2026-09-08" },
		assets: {
			notFoundHandling: "single-page-application",
			// Worker-first path patterns + SPA fallback break `alchemy dev` in
			// beta.79 (alchemy-run/alchemy#1729, fixed after that release), so
			// local dev routes everything through the Worker, which falls back
			// to ASSETS for anything it doesn't handle.
			runWorkerFirst: isLocalDev(stack.stage) ? true : ["/api/*", "/g/*"],
		},
		env: {
			KV: Kv,
			OG_IMAGES: OgImages,
			SHARE_LIMITER: ShareLimiter,
			IGDB_CLIENT_ID: Config.Redacted("IGDB_CLIENT_ID"),
			IGDB_CLIENT_SECRET: Config.Redacted("IGDB_CLIENT_SECRET"),
			TURNSTILE_SECRET: Config.Redacted("TURNSTILE_SECRET"),
			TMDB_API_KEY: Config.Redacted("TMDB_API_KEY"),
		},
	})),
);

export type WorkerEnv = Cloudflare.InferEnv<typeof Website>;

// Secrets (Config.Redacted above) resolve from the process env, then .env.
// Production deploys pass --env-file .env.prod, which holds prod-only values
// such as the real Turnstile secret (.env has Cloudflare's test secret).
export default Alchemy.Stack(
	"CoreFour",
	{
		providers: Cloudflare.providers(),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const website = yield* Website;
		return { url: website.url };
	}),
);
