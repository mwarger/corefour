import { Effect, Option, Schema } from 'effect'
import { Command, type Runtime, type Update } from 'foldkit'
import type { Url } from 'foldkit/url'

import { Grid } from '../shared/schema'
import * as GridDomain from './domain/grid'
import { Message } from './message'
import { Model } from './model'
import { Editor, Shared } from './page'
import { loadDraft } from './resource/draftStorage'
import { AppRoute, urlToAppRoute } from './route'

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
  const editor = Editor.init(
    Option.getOrElse(flags.maybeDraft, GridDomain.empty),
  )

  return AppRoute.matchOrElse<Update.Return<Model, Message>>(
    route,
    {
      Shared: ({ id }) => {
        const sharedInit = Shared.init(id)
        return {
          model: { route, editor, shared: sharedInit.model },
          commands: Command.mapMessages(sharedInit.commands, message =>
            Message.GotSharedMessage({ message }),
          ),
        }
      },
    },
    () => ({ model: { route, editor, shared: Shared.initIdle() } }),
  )
}
