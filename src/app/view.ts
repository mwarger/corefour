import type { Document, Html, HtmlBuilder } from 'foldkit/html'

import { Message } from './message'
import { Model } from './model'
import { Editor, Shared } from './page'
import { AppRoute, editorRouter } from './route'
import { pageView, posterFrameView } from './view/layout'

const SITE_NAME = 'Core Four'

const title = (route: AppRoute): string =>
  AppRoute.match(route, {
    Editor: () => `My ${SITE_NAME}`,
    Shared: () => `A shared ${SITE_NAME} poster`,
    NotFound: () => `Page not found · ${SITE_NAME}`,
  })

const notFoundView = (path: string, h: HtmlBuilder<Message>): Html =>
  pageView(
    {
      toolbar: [],
      notices: [],
      content: posterFrameView(
        h.div(
          [h.Class('py-20 text-center text-lg')],
          [
            h.h1(
              [h.Class('inline font-normal')],
              [`There's nothing at ${path}.`],
            ),
            ' ',
            h.a(
              [h.Href(editorRouter()), h.Class('font-semibold underline')],
              ['Make your own'],
            ),
          ],
        ),
        h,
      ),
    },
    h,
  )

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
    NotFound: ({ path }) => notFoundView(path, h),
  }),
})
