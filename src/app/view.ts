import type { Document, HtmlBuilder } from 'foldkit/html'

import { Message } from './message'
import { Model } from './model'
import { Editor, Shared } from './page'
import { AppRoute } from './route'
import { messagePageView } from './view/layout'

const SITE_NAME = 'Core Four'

const title = (route: AppRoute): string =>
  AppRoute.match(route, {
    Editor: () => `My ${SITE_NAME}`,
    Shared: () => `A shared ${SITE_NAME} poster`,
    NotFound: () => `Page not found · ${SITE_NAME}`,
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: title(model.route),
  body: AppRoute.match(model.route, {
    Editor: () =>
      h.submodel({
        slotId: 'editor',
        model: model.editor,
        view: Editor.view,
        toParentMessage: message => Message.GotEditorMessage({ message }),
      }),
    Shared: () =>
      h.submodel({
        slotId: 'shared',
        model: model.shared,
        view: Shared.view,
        toParentMessage: message => Message.GotSharedMessage({ message }),
      }),
    NotFound: ({ path }) =>
      messagePageView(
        { heading: `There's nothing at ${path}.`, isLinkingToEditor: true },
        h,
      ),
  }),
})
