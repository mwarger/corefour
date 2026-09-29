import { Array, Option, Schema } from 'effect'

import { CategoryId, SourceId, ThemeId, findSubtitle } from './catalog.ts'

/** Every poster has exactly this many slots. */
export const GRID_SIZE = 4

/** One pick on a poster. Names and images always come from the source database. */
export const Item = Schema.Struct({
  source: SourceId,
  id: Schema.String,
  name: Schema.String,
  maybeYear: Schema.OptionFromOptional(Schema.Number),
  /** Source-specific image key, served via /api/img/:source/:size/:image. */
  image: Schema.String,
})
export type Item = typeof Item.Type

/** A search result: an Item plus details that help tell similar titles apart. */
export const SearchResult = Schema.Struct({
  ...Item.fields,
  platforms: Schema.Array(Schema.String),
  /** Set for non-original releases, e.g. "Remake" or "Port". */
  maybeKind: Schema.OptionFromOptional(Schema.String),
})
export type SearchResult = typeof SearchResult.Type

export const SearchResults = Schema.Array(SearchResult)

export const itemFromSearchResult = ({
  source,
  id,
  name,
  maybeYear,
  image,
}: SearchResult): Item => Item.make({ source, id, name, maybeYear, image })

const slots = <S extends Schema.Top>(slot: S) =>
  Schema.Array(Schema.OptionFromNullOr(slot)).check(
    Schema.isLengthBetween(GRID_SIZE, GRID_SIZE),
  )

const isKnownSubtitle = Schema.makeFilter(
  ({ category, subtitle }: { category: CategoryId; subtitle: string }) =>
    Option.isSome(findSubtitle(category, subtitle)) || 'Unknown subtitle',
)

export const Grid = Schema.Struct({
  category: CategoryId,
  subtitle: Schema.String,
  theme: ThemeId,
  items: slots(Item),
}).check(isKnownSubtitle)
export type Grid = typeof Grid.Type

/** How grids are stored (KV, localStorage) and sent over the wire. */
export const GridJson = Schema.fromJsonString(Schema.toCodecJson(Grid))

const IGDB_ID_PATTERN = /^\d{1,10}$/

export const ItemRef = Schema.Struct({
  source: SourceId,
  id: Schema.String.check(Schema.isPattern(IGDB_ID_PATTERN)),
})
export type ItemRef = typeof ItemRef.Type

const MAX_TURNSTILE_TOKEN_LENGTH = 4096

/**
 * Sharing sends references only; the Worker resolves names and images from
 * the source database, so nothing a visitor types can reach a poster.
 */
export const ShareRequest = Schema.Struct({
  category: CategoryId,
  subtitle: Schema.String,
  theme: ThemeId,
  items: slots(ItemRef),
  turnstileToken: Schema.String.check(
    Schema.isMaxLength(MAX_TURNSTILE_TOKEN_LENGTH),
  ),
}).check(
  isKnownSubtitle,
  Schema.makeFilter(
    ({ items }) => Array.some(items, Option.isSome) || 'Poster is empty',
  ),
)
export type ShareRequest = typeof ShareRequest.Type

export const ShareRequestJson = Schema.toCodecJson(ShareRequest)

export const ShareResponse = Schema.Struct({ id: Schema.String })
export const ErrorResponse = Schema.Struct({ error: Schema.String })
