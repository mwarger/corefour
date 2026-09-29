import { Effect, Option, Schema } from 'effect'
import { type Runtime, Update } from 'foldkit'
import type { UrlRequest } from 'foldkit/navigation'
import type { Url } from 'foldkit/url'

import { Grid, SharedPoster } from '../shared/schema'
import * as Poster from './domain/poster'
import { Message } from './message'
import type { Model } from './model'
import { Editor, Shared } from './page'
import { loadDraft } from './resource/draftStorage'
import { urlToAppRoute } from './route'
import { RestoreDraft, enterRoute } from './update'

// FLAGS

export const Flags = Schema.Struct({
  maybeDraft: Schema.Option(Grid),
  /**
   * Set when the Worker rendered a shared poster's page. The browser reads
   * these Flags back from the page when it hydrates.
   */
  maybeSharedPoster: Schema.Option(SharedPoster),
})
export type Flags = typeof Flags.Type

/** Flags for a page the browser renders itself. */
export const flags: Effect.Effect<Flags> = loadDraft.pipe(
  Effect.map(maybeDraft =>
    Flags.make({ maybeDraft, maybeSharedPoster: Option.none() }),
  ),
)

// ROUTING

export const routing = {
  onUrlRequest: (request: UrlRequest) => Message.ClickedLink({ request }),
  onUrlChange: (url: Url) => Message.ChangedUrl({ url }),
}

// INIT

const restoreDraft: Update.Step<Model, Message> = model => ({
  model,
  commands: [RestoreDraft()],
})

export const init: Runtime.RoutingApplicationInit<Model, Message, Flags> = (
  flags: Flags,
  url: Url,
): Update.Return<Model, Message> => {
  const route = urlToAppRoute(url)
  const model: Model = {
    route,
    editor: Editor.init(Option.getOrElse(flags.maybeDraft, Poster.empty)),
    shared: Option.match(flags.maybeSharedPoster, {
      onNone: Shared.initIdle,
      onSome: ({ id, grid }) => Shared.initLoaded(id, grid),
    }),
  }

  return Option.isSome(flags.maybeSharedPoster)
    ? Update.combine(model, [enterRoute(route), restoreDraft])
    : enterRoute(route)(model)
}
