import { Effect, Option, Schema } from 'effect'
import type { Runtime, Update } from 'foldkit'
import type { Url } from 'foldkit/url'

import { Grid } from '../shared/schema'
import * as Poster from './domain/poster'
import type { Message } from './message'
import type { Model } from './model'
import { Editor, Shared } from './page'
import { loadDraft } from './resource/draftStorage'
import { urlToAppRoute } from './route'
import { enterRoute } from './update'

// FLAGS

export const Flags = Schema.Struct({
  maybeDraft: Schema.Option(Grid),
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = loadDraft.pipe(
  Effect.map(maybeDraft => Flags.make({ maybeDraft })),
)

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message, Flags> = (
  flags: Flags,
  url: Url,
): Update.Return<Model, Message> => {
  const route = urlToAppRoute(url)
  return enterRoute(route)({
    route,
    editor: Editor.init(Option.getOrElse(flags.maybeDraft, Poster.empty)),
    shared: Shared.initIdle(),
  })
}
