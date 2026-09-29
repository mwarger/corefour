import { Effect, Option, Schema } from 'effect'
import { Command, Update } from 'foldkit'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import type { Grid } from '../shared/schema'
import { Message } from './message'
import { Model } from './model'
import { Editor, Shared } from './page'
import { AppRoute, editorRouter, urlToAppRoute } from './route'

type UpdateReturn = Update.Return<Model, Message>

export const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

const foldEditor = Update.foldChild({
  update: Editor.update,
  read: (model: Model) => Option.some(model.editor),
  write: (model, nextEditor) =>
    modifyFields(model, { editor: () => nextEditor }),
  toParentMessage: message => Message.GotEditorMessage({ message }),
})

const replaceEditorGrid = (grid: Grid): Update.Step<Model, Message> =>
  Update.foldChildStep({
    update: (editor: Editor.Model) => Editor.replaceGrid(editor, grid),
    read: (model: Model) => Option.some(model.editor),
    write: (model, nextEditor) =>
      modifyFields(model, { editor: () => nextEditor }),
    toParentMessage: message => Message.GotEditorMessage({ message }),
  })

const navigateToEditor: Update.Step<Model, Message> = stepModel => ({
  model: stepModel,
  commands: [NavigateInternal({ url: editorRouter() })],
})

const foldSharedOutMessage = Shared.OutMessage.match<
  Update.Step<Model, Message>
>({
  RequestedRemix:
    ({ grid }) =>
    model =>
      Update.combine(model, [replaceEditorGrid(grid), navigateToEditor]),
})

const foldShared = Update.foldChild({
  update: Shared.update,
  read: (model: Model) => Option.some(model.shared),
  write: (model, nextShared) =>
    modifyFields(model, { shared: () => nextShared }),
  toParentMessage: message => Message.GotSharedMessage({ message }),
  foldOutMessage: foldSharedOutMessage,
})

const enterRoute = (model: Model, route: AppRoute): UpdateReturn => {
  const routedModel = modifyFields(model, { route: () => route })

  return AppRoute.matchOrElse<UpdateReturn>(
    route,
    {
      Shared: ({ id }) => {
        if (id === model.shared.gridId) {
          return { model: routedModel }
        }
        const sharedInit = Shared.init(id)
        return {
          model: modifyFields(routedModel, { shared: () => sharedInit.model }),
          commands: Command.mapMessages(sharedInit.commands, message =>
            Message.GotSharedMessage({ message }),
          ),
        }
      },
    },
    () => ({ model: routedModel }),
  )
}

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),

    ChangedUrl: ({ url }) => enterRoute(model, urlToAppRoute(url)),

    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    GotEditorMessage: ({ message }) => foldEditor(model, message),
    GotSharedMessage: ({ message }) => foldShared(model, message),
  })
