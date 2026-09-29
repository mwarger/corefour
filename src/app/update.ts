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

const readEditor = (model: Model) => Option.some(model.editor)
const writeEditor = (model: Model, nextEditor: Editor.Model): Model =>
  modifyFields(model, { editor: () => nextEditor })
const toGotEditorMessage = (message: Editor.Message): Message =>
  Message.GotEditorMessage({ message })

const readShared = (model: Model) => Option.some(model.shared)
const writeShared = (model: Model, nextShared: Shared.Model): Model =>
  modifyFields(model, { shared: () => nextShared })
const toGotSharedMessage = (message: Shared.Message): Message =>
  Message.GotSharedMessage({ message })

const foldEditor = Update.foldChild({
  update: Editor.update,
  read: readEditor,
  write: writeEditor,
  toParentMessage: toGotEditorMessage,
})

const loadIntoEditor = (grid: Grid): Update.Step<Model, Message> =>
  Update.foldChildStep({
    update: Editor.editGrid(() => grid),
    read: readEditor,
    write: writeEditor,
    toParentMessage: toGotEditorMessage,
  })

const navigateToEditor: Update.Step<Model, Message> = model => ({
  model,
  commands: [NavigateInternal({ url: editorRouter() })],
})

const foldSharedOutMessage = Shared.OutMessage.match<
  Update.Step<Model, Message>
>({
  RequestedRemix:
    ({ grid }) =>
    model =>
      Update.combine(model, [loadIntoEditor(grid), navigateToEditor]),
})

const foldShared = Update.foldChild({
  update: Shared.update,
  read: readShared,
  write: writeShared,
  toParentMessage: toGotSharedMessage,
  foldOutMessage: foldSharedOutMessage,
})

/** Switches to a route, loading the shared poster it names unless already shown. */
export const enterRoute =
  (route: AppRoute): Update.Step<Model, Message> =>
  model => {
    const routedModel = modifyFields(model, { route: () => route })

    return AppRoute.matchOrElse<UpdateReturn>(
      route,
      {
        Shared: ({ id }) =>
          Shared.isShowing(model.shared, id)
            ? { model: routedModel }
            : Update.foldChildInit(Shared.init(id), {
                toParentModel: nextShared =>
                  writeShared(routedModel, nextShared),
                toParentMessage: toGotSharedMessage,
              }),
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

    ChangedUrl: ({ url }) => enterRoute(urlToAppRoute(url))(model),

    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    GotEditorMessage: ({ message }) => foldEditor(model, message),
    GotSharedMessage: ({ message }) => foldShared(model, message),
  })
