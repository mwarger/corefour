import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { type Grid, GridJson } from '../../shared/schema'

const DRAFT_STORAGE_KEY = 'corefour:draft'

/** The poster being edited, if one was saved and still decodes. */
export const loadDraft: Effect.Effect<Option.Option<Grid>> = Effect.gen(
  function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const maybeJson = Option.fromNullishOr(yield* store.get(DRAFT_STORAGE_KEY))
    return Option.flatMap(maybeJson, Schema.decodeUnknownOption(GridJson))
  },
).pipe(
  Effect.catch(() => Effect.succeed(Option.none())),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

export const saveDraft = (grid: Grid) =>
  Effect.gen(function* () {
    const json = yield* Schema.encodeEffect(GridJson)(grid)
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(DRAFT_STORAGE_KEY, json)
  }).pipe(Effect.provide(BrowserKeyValueStore.layerLocalStorage))
