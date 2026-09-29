import type { Document, HtmlBuilder } from 'foldkit/html'

import { CATEGORIES, DEFAULT_CATEGORY } from '../shared/catalog'
import { Message } from './message'
import { Model } from './model'
import { Editor, Shared } from './page'
import { AppRoute } from './route'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: CATEGORIES[DEFAULT_CATEGORY].title,
  body: AppRoute.matchOrElse(
    model.route,
    {
      Shared: () =>
        h.submodel({
          slotId: 'shared',
          model: model.shared,
          view: Shared.view,
          toParentMessage: message => Message.GotSharedMessage({ message }),
        }),
    },
    () =>
      h.submodel({
        slotId: 'editor',
        model: model.editor,
        view: Editor.view,
        toParentMessage: message => Message.GotEditorMessage({ message }),
      }),
  ),
})
