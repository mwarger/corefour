import { env } from 'cloudflare:workers'
import { Array, Effect, Option, Schema, pipe } from 'effect'

import { ShareBusy, UnknownItem } from '../shared/api.ts'
import { Grid, GridId, GridJson, type ShareRequest } from '../shared/schema.ts'
import { gridId } from './ids.ts'
import { upgradeLegacyGrid } from './legacy.ts'
import { SOURCES } from './sources/index.ts'

const GRID_CACHE_TTL_SECONDS = 86_400

const encodeGrid = Schema.encodeSync(GridJson)
const decodeGrid = Schema.decodeUnknownOption(GridJson)
const isGridId = Schema.is(GridId)

const gridKey = (id: string) => `grid:${id}`

const isWriteLimitError = (error: unknown) =>
  error instanceof Error && /limit/i.test(error.message)

/** Builds the stored grid from references, taking names and images from the source. */
export const resolveGrid = (request: ShareRequest) =>
  Effect.gen(function* () {
    const ids = pipe(
      request.items,
      Array.getSomes,
      Array.map(({ id }) => id),
      Array.dedupe,
    )
    const found = yield* Effect.promise(() => SOURCES.Igdb.lookup(ids))

    const items = yield* Effect.forEach(request.items, maybeRef =>
      Option.match(maybeRef, {
        onNone: () => Effect.succeedNone,
        onSome: ref =>
          Option.match(Option.fromNullishOr(found.get(ref.id)), {
            onNone: () => Effect.fail(new UnknownItem()),
            onSome: Effect.succeedSome,
          }),
      }),
    )

    return Grid.make({
      category: request.category,
      subtitle: request.subtitle,
      theme: request.theme,
      items,
    })
  })

/**
 * Stores a grid under its content-addressed ID and returns the ID. Sharing
 * the same poster again finds the existing key and skips the write.
 */
export const saveGrid = (grid: Grid) =>
  Effect.gen(function* () {
    const json = encodeGrid(grid)
    const id = yield* Effect.promise(() => gridId(json))
    const key = gridKey(id)

    const existing = yield* Effect.promise(() => env.KV.get(key))
    if (existing === null) {
      yield* Effect.tryPromise({
        try: () => env.KV.put(key, json),
        catch: error => error,
      }).pipe(
        Effect.catch(error =>
          isWriteLimitError(error)
            ? Effect.fail(new ShareBusy())
            : Effect.die(error),
        ),
      )
    }

    return id
  })

export const loadGrid = (id: string) =>
  Effect.gen(function* () {
    if (!isGridId(id)) {
      return Option.none<Grid>()
    }

    const stored = yield* Effect.promise(() =>
      env.KV.get(gridKey(id), { cacheTtl: GRID_CACHE_TTL_SECONDS }),
    )
    return pipe(
      Option.fromNullishOr(stored),
      Option.flatMap(json => decodeGrid(upgradeLegacyGrid(json))),
    )
  })
