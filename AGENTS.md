# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: true

## Project Notes

**Core Four**: people pick the 4 games (later movies, albums, ...) that shaped them and share a 2×2 poster. There is deliberately no free text: titles are fixed per category, subtitles are presets (`src/shared/catalog.ts`), and item names/covers always come from the source database (IGDB). The Worker re-resolves item IDs when a poster is shared.

- **API:** `src/shared/api.ts` is the single definition of the Worker API. The Worker implements it in `src/worker/api.ts` (`HttpApiBuilder`); the client calls it through `HttpApiClient` in `src/app/resource/api.ts`. Change the definition, not either side alone.
- **SSR:** only `/g/:id` is server-rendered. The Worker imports `src/app/entry.server.ts` through the `#app/entry.server` Vite alias, typed by `src/shared/ssr.ts` (the Worker's tsconfig has no DOM types, so it must not import app code directly). App modules the Worker imports must not touch `document` or `window` at module level. `vite.config.ts` gives the client and Worker builds one `FOLDKIT_BUILD_ID`; hydration refuses mismatches. Rendered pages are cached in the `RenderedPages` R2 bucket under `pages/{buildId}/{id}.html` (never under the dev server); old builds' pages are harmless leftovers.
- **Layout:** Foldkit client in `src/app`, Cloudflare Worker (Effect `HttpApi`/`HttpRouter`) in `src/worker`, code shared by both in `src/shared`.
- **Infrastructure:** Alchemy v2, `alchemy.run.ts` (stack `CoreFour`). `bun run dev` runs `alchemy dev`; `bun run deploy` deploys the `prod` stage using `.env.prod`. Always confirm with the user before deploying.
- **Secrets:** `.env` (local dev, Turnstile test secret) and `.env.prod` (production). Both gitignored; see `.env.example`.
- **Versions:** `effect` is pinned to exactly `4.0.0-rc.116` because `foldkit@0.163.0` requires it (alchemy accepts it). Upgrade them together, along with the `@effect/*` versions and `overrides` in `package.json`.
- **Vendored source:** `repos/foldkit` is a read-only `git subtree` of the installed Foldkit version; update it with `git subtree pull` after upgrading.
- **Checks:** `bun run check` runs typecheck (separate app/worker tsconfigs), lint, and Vitest.
- **Package manager and runtime:** Bun. `bunfig.toml` runs scripts on Bun's runtime. `package.json` `overrides` pin the transitive `@effect/*` packages to the same release candidate as `effect`; Bun otherwise resolves their `^` ranges to newer RCs that need a newer `effect` (`bun pm ls` or a scan of `node_modules` shows drift).
