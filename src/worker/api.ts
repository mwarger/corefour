import { env } from 'cloudflare:workers'
import { Array, Effect, Layer, Option, Schema, String, pipe } from 'effect'
import {
  HttpEffect,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/unstable/http'
import { HttpApiBuilder, HttpApiScalar } from 'effect/unstable/httpapi'

import {
  CoreFourApi,
  GridNotFound,
  ImageNotFound,
  NotVerified,
  TooManyShares,
} from '../shared/api.ts'
import { CATEGORIES, type CategoryId } from '../shared/catalog.ts'
import { SearchResults } from '../shared/schema.ts'
import { runAfterResponse } from './execution.ts'
import { loadGrid, resolveGrid, saveGrid } from './grids.ts'
import { ensureOgImage } from './og.tsx'
import { SOURCES } from './sources/index.ts'
import { verifyTurnstile } from './turnstile.ts'

const ONE_DAY_SECONDS = 86_400
const ONE_YEAR_SECONDS = 31_536_000
const CACHE_FOR_A_DAY = `public, max-age=${ONE_DAY_SECONDS}`
const CACHE_FOREVER = `public, max-age=${ONE_YEAR_SECONDS}, immutable`

const MIN_QUERY_LENGTH = 2

// Bump when search result shape or ranking changes to bypass stale cache.
const SEARCH_CACHE_VERSION = 6

const PREVIEW_FILE_PATTERN = /^([0-9A-Za-z]{10})\.png$/

/** Sets Cache-Control on the response once the handler has succeeded. */
const cacheWith = (cacheControl: string) =>
  HttpEffect.appendPreResponseHandler((_request, response) =>
    Effect.succeed(
      HttpServerResponse.setHeader(response, 'cache-control', cacheControl),
    ),
  )

// SEARCH

const SearchResultsJson = Schema.fromJsonString(
  Schema.toCodecJson(SearchResults),
)
const encodeSearchResults = Schema.encodeSync(SearchResultsJson)
const decodeSearchResults = Schema.decodeUnknownOption(SearchResultsJson)

const searchCacheKey = (category: CategoryId, query: string) =>
  new Request(
    `https://cache.corefour/search/v${SEARCH_CACHE_VERSION}/${category}?q=${encodeURIComponent(query)}`,
  )

/**
 * Results are cached per colo with the Cache API, so repeat searches don't
 * hit the source API (and don't spend KV writes).
 */
const cachedSearch = (category: CategoryId, query: string) =>
  Effect.gen(function* () {
    const cache = yield* Effect.promise(() => caches.open('search'))
    const key = searchCacheKey(category, query)

    const maybeCached = yield* Effect.promise(async () => {
      const hit = await cache.match(key)
      return hit === undefined
        ? Option.none()
        : decodeSearchResults(await hit.text())
    })
    if (Option.isSome(maybeCached)) {
      return maybeCached.value
    }

    const results = yield* Effect.promise(() =>
      SOURCES[CATEGORIES[category].source].search(query),
    )
    yield* runAfterResponse(
      Effect.promise(() =>
        cache.put(
          key,
          new Response(encodeSearchResults(results), {
            headers: { 'cache-control': CACHE_FOR_A_DAY },
          }),
        ),
      ),
    )
    return results
  })

const SearchLive = HttpApiBuilder.group(CoreFourApi, 'search', handlers =>
  handlers.handle('search', ({ query: { category, q } }) =>
    Effect.gen(function* () {
      const query = pipe(q, String.trim, String.toLowerCase)
      const results =
        query.length < MIN_QUERY_LENGTH
          ? []
          : yield* cachedSearch(category, query)

      yield* cacheWith(CACHE_FOR_A_DAY)
      return results
    }),
  ),
)

// GRIDS

const clientIp = Effect.map(HttpServerRequest.HttpServerRequest, request =>
  Option.fromNullishOr(request.headers['cf-connecting-ip']),
)

const GridsLive = HttpApiBuilder.group(CoreFourApi, 'grids', handlers =>
  handlers
    .handle('share', ({ payload }) =>
      Effect.gen(function* () {
        const maybeIp = yield* clientIp
        const { success: isWithinLimit } = yield* Effect.promise(() =>
          env.SHARE_LIMITER.limit({
            key: Option.getOrElse(maybeIp, () => 'unknown'),
          }),
        )
        if (!isWithinLimit) {
          return yield* new TooManyShares()
        }

        const isHuman = yield* verifyTurnstile(payload.turnstileToken, maybeIp)
        if (!isHuman) {
          return yield* new NotVerified()
        }

        const grid = yield* resolveGrid(payload)
        const id = yield* saveGrid(grid)
        yield* runAfterResponse(ensureOgImage(id, grid))
        return { id }
      }),
    )
    .handle('get', ({ params: { id } }) =>
      Effect.gen(function* () {
        const maybeGrid = yield* loadGrid(id)
        if (Option.isNone(maybeGrid)) {
          return yield* new GridNotFound()
        }

        yield* cacheWith(CACHE_FOREVER)
        return maybeGrid.value
      }),
    ),
)

// IMAGES

const ImagesLive = HttpApiBuilder.group(CoreFourApi, 'images', handlers =>
  handlers
    // Same-origin image proxy so the poster can be exported to PNG without
    // tainting the canvas. Only fetches from each source's own image host.
    .handle('cover', ({ params: { source, size, key } }) =>
      Effect.gen(function* () {
        const maybeUrl = Option.fromNullishOr(
          SOURCES[source].imageUrl(size, key),
        )
        if (Option.isNone(maybeUrl)) {
          return yield* new ImageNotFound()
        }

        const upstream = yield* Effect.promise(() =>
          fetch(maybeUrl.value, {
            cf: { cacheEverything: true, cacheTtl: ONE_YEAR_SECONDS },
          }),
        )
        if (!upstream.ok) {
          return yield* new ImageNotFound()
        }

        return HttpServerResponse.fromWeb(
          new Response(upstream.body, {
            headers: {
              'content-type':
                upstream.headers.get('content-type') ?? 'image/jpeg',
              'cache-control': CACHE_FOREVER,
            },
          }),
        )
      }),
    )
    // Link-preview image, normally pre-rendered to R2 when the poster was shared.
    .handle('preview', ({ params: { file } }) =>
      Effect.gen(function* () {
        const maybeId = pipe(
          file,
          String.match(PREVIEW_FILE_PATTERN),
          Option.flatMap(Array.get(1)),
        )
        const maybeGrid = Option.isSome(maybeId)
          ? yield* loadGrid(maybeId.value)
          : Option.none()
        if (Option.isNone(maybeId) || Option.isNone(maybeGrid)) {
          return yield* new GridNotFound()
        }

        const png = yield* ensureOgImage(maybeId.value, maybeGrid.value)
        return HttpServerResponse.uint8Array(png, {
          contentType: 'image/png',
          headers: { 'cache-control': CACHE_FOREVER },
        })
      }),
    ),
)

// HEALTH

const HealthLive = HttpApiBuilder.group(CoreFourApi, 'health', handlers =>
  handlers.handle('check', () => Effect.succeed({ ok: true })),
)

const OPENAPI_PATH = '/api/openapi.json'
const DOCS_PATH = '/api/docs'

/** Interactive reference generated from the same definition; Scalar loads from its CDN. */
const DocsLive = HttpApiScalar.layerCdn(CoreFourApi, { path: DOCS_PATH })

export const ApiLive = Layer.mergeAll(
  HttpApiBuilder.layer(CoreFourApi, { openapiPath: OPENAPI_PATH }),
  DocsLive,
).pipe(Layer.provide([SearchLive, GridsLive, ImagesLive, HealthLive]))
