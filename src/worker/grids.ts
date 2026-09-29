import { env } from 'cloudflare:workers'
import { Array, Option, Schema, pipe } from 'effect'

import { Grid, GridJson, type ShareRequest } from '../shared/schema.ts'
import { GRID_ID_PATTERN, gridId } from './ids.ts'
import { SOURCES } from './sources/index.ts'

/** Thrown when an item reference doesn't resolve in its source database. */
export class UnknownItemError extends Error {}

/** Thrown when KV's daily write quota is exhausted. */
export class ShareBusyError extends Error {}

const encodeGrid = Schema.encodeSync(GridJson)
const decodeGrid = Schema.decodeUnknownOption(GridJson)

/** Builds the stored grid from references, taking names and images from the source. */
export const resolveGrid = async (request: ShareRequest): Promise<Grid> => {
  const ids = pipe(
    request.items,
    Array.getSomes,
    Array.map(({ id }) => id),
    Array.dedupe,
  )
  const found = await SOURCES.Igdb.lookup(ids)
  const items = Array.map(request.items, maybeRef =>
    Option.map(maybeRef, ref => {
      const item = found.get(ref.id)
      if (!item) {
        throw new UnknownItemError(`Unknown ${ref.source} item ${ref.id}`)
      }
      return item
    }),
  )
  return Grid.make({
    category: request.category,
    subtitle: request.subtitle,
    theme: request.theme,
    items,
  })
}

/** Stores a grid under its content-addressed ID and returns the ID. */
export const saveGrid = async (grid: Grid): Promise<string> => {
  const json = encodeGrid(grid)
  const id = await gridId(json)
  const key = `grid:${id}`
  if ((await env.KV.get(key)) === null) {
    try {
      await env.KV.put(key, json)
    } catch (error) {
      if (error instanceof Error && /limit/i.test(error.message)) {
        throw new ShareBusyError()
      }
      throw error
    }
  }
  return id
}

/** The stored JSON for a grid, if it exists and still decodes. */
export const loadGridJson = async (
  id: string,
): Promise<Option.Option<string>> => {
  if (!GRID_ID_PATTERN.test(id)) {
    return Option.none()
  }
  const stored = await env.KV.get(`grid:${id}`, { cacheTtl: 86_400 })
  return pipe(
    Option.fromNullishOr(stored),
    Option.filter(json => Option.isSome(decodeGrid(json))),
  )
}

export const loadGrid = async (id: string): Promise<Option.Option<Grid>> =>
  Option.flatMap(await loadGridJson(id), decodeGrid)
