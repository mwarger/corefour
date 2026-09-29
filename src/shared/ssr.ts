import type { Effect } from 'effect'

import type { SharedPoster } from './schema.ts'

export type SharedPageRequest = Readonly<{
  /** The client build's index.html, with its empty `#root` placeholder. */
  template: string
  /** The public URL being rendered. */
  url: string
  poster: SharedPoster
}>

/**
 * Renders a shared poster's page to HTML with Foldkit, ready for the client to
 * hydrate. The app implements it (`src/app/entry.server.ts`) and the Worker
 * calls it; this type is the contract between the two TypeScript projects.
 */
export type RenderSharedPage = (
  request: SharedPageRequest,
) => Effect.Effect<string, Error>

/** What the app's server entry gives the Worker. */
export type AppServer = Readonly<{
  renderSharedPage: RenderSharedPage
  /** Stamped on every rendered page; a new deployment gets a new one. */
  buildId: string
  /** Under the dev server, where code changes without a new build id. */
  isDevelopment: boolean
}>
