import { env } from 'cloudflare:workers'
import { Array, Effect, Option, pipe } from 'effect'
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/unstable/http'

import { CATEGORIES, findSubtitle } from '../shared/catalog.ts'
import type { Grid } from '../shared/schema.ts'
import { runAfterResponse } from './execution.ts'
import { loadGrid } from './grids.ts'
import { ogImagePath } from './og.tsx'

import { buildId, isDevelopment, renderSharedPage } from '#app/entry.server'

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

const withPreviewTags = (
  page: Response,
  id: string,
  grid: Grid,
  pageUrl: string,
) => {
  const names = pipe(
    grid.items,
    Array.getSomes,
    Array.map(({ name }) => name),
  )
  const heading = CATEGORIES[grid.category].title
  const subtitle = Option.match(findSubtitle(grid.category, grid.subtitle), {
    onNone: () => '',
    onSome: ({ text }) => text,
  })
  const title = escapeHtml(heading)
  const description = escapeHtml(names.join(' · '))
  const alt = escapeHtml(`${heading}, ${subtitle}: ${names.join(', ')}`)
  const image = escapeHtml(new URL(ogImagePath(id), pageUrl).href)
  const url = escapeHtml(new URL(`/g/${id}`, pageUrl).href)
  const meta = `
		<meta name="description" content="${description}" />
		<meta property="og:type" content="website" />
		<meta property="og:site_name" content="Core Four" />
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
		<meta name="twitter:image:alt" content="${alt}" />`

  // Tags go first so crawlers that only read the first chunk see them.
  return new HTMLRewriter()
    .on('head', { element: el => void el.prepend(meta, { html: true }) })
    .transform(page)
}

/** Must match what static assets send for index.html, which it replaces. */
const PAGE_CACHE_CONTROL = 'public, max-age=0, must-revalidate'

// NOTE: a page is cached per deployment because it embeds that build's id
// and asset URLs. Posters never change, so nothing else invalidates it. The
// dev server changes code without a new build id, so it always renders.
const pageKey = (id: string) => `pages/${buildId}/${id}.html`

/** This poster's page as this deployment already rendered it. */
const loadRenderedPage = (id: string) =>
  isDevelopment
    ? Effect.succeedNone
    : Effect.promise(async () => {
        const stored = await env.RENDERED_PAGES.get(pageKey(id))
        return stored === null
          ? Option.none<string>()
          : Option.some(await stored.text())
      })

const storeRenderedPage = (id: string, html: string) =>
  isDevelopment
    ? Effect.void
    : runAfterResponse(
        Effect.promise(() =>
          env.RENDERED_PAGES.put(pageKey(id), html, {
            httpMetadata: { contentType: 'text/html; charset=utf-8' },
          }),
        ),
      )

/**
 * The poster's page rendered by Foldkit, so it arrives complete and the
 * browser hydrates it. If rendering fails, the plain app shell still works:
 * the browser boots normally and fetches the poster itself. Only a successful
 * render is stored.
 */
const renderPage = (id: string, grid: Grid, url: string) =>
  Effect.gen(function* () {
    const shell = yield* Effect.promise(() =>
      env.ASSETS.fetch(new URL('/', url)),
    )
    const template = yield* Effect.promise(() => shell.text())

    return yield* renderSharedPage({
      template,
      url,
      poster: { id, grid },
    }).pipe(
      Effect.tap(html => storeRenderedPage(id, html)),
      Effect.tapError(error => Effect.logError('Server render failed', error)),
      Effect.orElseSucceed(() => template),
    )
  })

const htmlResponse = (html: string) =>
  new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': PAGE_CACHE_CONTROL,
    },
  })

/**
 * Shared posters are server-rendered and carry Open Graph tags, so links
 * unfurl with a preview image in chat apps and social sites.
 */
export const SharePageLive = HttpRouter.add(
  'GET',
  '/g/:id',
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const { id = '' } = yield* HttpRouter.params
    const pageUrl = request.originalUrl

    const maybeGrid = yield* loadGrid(id)
    if (Option.isNone(maybeGrid)) {
      return HttpServerResponse.fromWeb(
        yield* Effect.promise(() => env.ASSETS.fetch(new URL('/', pageUrl))),
      )
    }
    const grid = maybeGrid.value

    const maybeRenderedPage = yield* loadRenderedPage(id)
    const html = Option.isSome(maybeRenderedPage)
      ? maybeRenderedPage.value
      : yield* renderPage(id, grid, pageUrl)

    return HttpServerResponse.fromWeb(
      withPreviewTags(htmlResponse(html), id, grid, pageUrl),
    )
  }),
)
