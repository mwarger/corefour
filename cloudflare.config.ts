import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/worker/index.ts" with { type: "cf-worker" };

export default defineConfig({
	worker: {
		name: "mynine",
		compatibilityDate: "2026-09-25",
		entrypoint,
		assets: {
			notFoundHandling: "single-page-application",
			runWorkerFirst: ["/api/*", "/g/*"],
		},
		env: {
			ASSETS: bindings.assets(),
			// Share links (grid:{id}) and IGDB search/token cache.
			KV: bindings.kv(),
			// Twitch developer app credentials for the IGDB API.
			IGDB_CLIENT_ID: bindings.secret(),
			IGDB_CLIENT_SECRET: bindings.secret(),
		},
	},
});
