# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: true

## Project Notes

**Core Four**: people pick the 4 games (later movies, albums, ...) that shaped them and share a 2×2 poster. There is deliberately no free text: titles are fixed per category, subtitles are presets (`src/shared/catalog.ts`), and item names/covers always come from the source database (IGDB). The Worker re-resolves item IDs when a poster is shared.

- **API:** `src/shared/api.ts` is the single definition of the Worker API. The Worker implements it in `src/worker/api.ts` (`HttpApiBuilder`); the client calls it through `HttpApiClient` in `src/app/resource/api.ts`. Change the definition, not either side alone.
- **Layout:** Foldkit client in `src/app`, Cloudflare Worker (Effect `HttpApi`/`HttpRouter`) in `src/worker`, code shared by both in `src/shared`.
- **Infrastructure:** Alchemy v2, `alchemy.run.ts` (stack `CoreFour`). `pnpm dev` runs `alchemy dev`; `pnpm run deploy` deploys the `prod` stage using `.env.prod` (never `pnpm deploy`, which is a pnpm builtin). Always confirm with the user before deploying.
- **Secrets:** `.env` (local dev, Turnstile test secret) and `.env.prod` (production). Both gitignored; see `.env.example`.
- **Versions:** `effect` is pinned to exactly `4.0.0-rc.116` because `foldkit@0.163.0` requires it (alchemy accepts it). Upgrade them together.
- **Vendored source:** `repos/foldkit` is a read-only `git subtree` of the installed Foldkit version; update it with `git subtree pull` after upgrading.
- **Checks:** `pnpm check` runs typecheck (separate app/worker tsconfigs) and Vitest.
