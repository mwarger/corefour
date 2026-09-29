import { env } from 'cloudflare:workers'
import { Array, Effect, Option, pipe } from 'effect'
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/unstable/http'

import { CATEGORIES, findSubtitle } from '../shared/catalog.ts'
import type { Grid } from '../shared/schema.ts'
import { loadGrid } from './grids.ts'
import { ogImagePath } from './og.tsx'

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

  return (
    new HTMLRewriter()
      .on('title', { element: el => void el.setInnerContent(heading) })
      // Tags go first so crawlers that only read the first chunk see them.
      .on('head', { element: el => void el.prepend(meta, { html: true }) })
      .transform(page)
  )
}

/**
 * Shared posters get the app shell plus Open Graph tags, so links unfurl with
 * a preview image in chat apps and social sites.
 */
export const SharePageLive = HttpRouter.add(
  'GET',
  '/g/:id',
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const { id = '' } = yield* HttpRouter.params
    const pageUrl = request.originalUrl

    const [page, maybeGrid] = yield* Effect.all(
      [
        Effect.promise(() => env.ASSETS.fetch(new URL('/', pageUrl))),
        loadGrid(id),
      ],
      { concurrency: 'unbounded' },
    )

    return HttpServerResponse.fromWeb(
      Option.match(maybeGrid, {
        onNone: () => page,
        onSome: grid => withPreviewTags(page, id, grid, pageUrl),
      }),
    )
  }),
)
