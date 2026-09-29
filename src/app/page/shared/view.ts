import { Array, Match, Option } from 'effect'
import { AsyncData, Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Grid } from '../../../shared/schema'
import { editorRouter } from '../../route'
import {
  actionButtonView,
  errorNoticeView,
  pageView,
  posterFrameView,
} from '../../view/layout'
import {
  posterView,
  readOnlySlotView,
  readOnlySubtitleView,
} from '../../view/poster'
import { Message } from './message'
import { type LoadError, Model } from './model'

const makeYourOwnLinkView = (h: HtmlBuilder<Message>): Html =>
  h.a(
    [h.Href(editorRouter()), h.Class('mr-auto font-semibold hover:underline')],
    ['← Make your own'],
  )

const loadErrorView = (error: LoadError, h: HtmlBuilder<Message>): Html =>
  h.p(
    [h.Class('py-20 text-center text-lg')],
    [
      Match.value(error).pipe(
        Match.when('NotFound', () => "This poster doesn't exist. "),
        Match.when('Unavailable', () => "Couldn't load this poster. "),
        Match.exhaustive,
      ),
      h.a(
        [h.Href(editorRouter()), h.Class('font-semibold underline')],
        ['Make your own'],
      ),
    ],
  )

const loadedView = (model: Model, grid: Grid, h: HtmlBuilder<Message>): Html =>
  pageView(
    {
      toolbar: [
        makeYourOwnLinkView(h),
        actionButtonView(
          {
            label: 'Remix',
            onClick: Message.ClickedRemix(),
            isPrimary: false,
            isBusy: false,
            isDisabled: false,
          },
          h,
        ),
        actionButtonView(
          {
            label: 'Download PNG',
            onClick: Message.ClickedDownloadPng(),
            isPrimary: true,
            isBusy: model.imageExport._tag === 'Exporting',
            isDisabled: false,
          },
          h,
        ),
      ],
      maybeNotice:
        model.imageExport._tag === 'Failed'
          ? Option.some(errorNoticeView(model.imageExport.error, h))
          : Option.none(),
      content: posterFrameView(
        posterView(
          {
            grid,
            subtitle: readOnlySubtitleView(grid, h),
            slots: Array.map(grid.items, maybeItem =>
              readOnlySlotView(maybeItem, h),
            ),
          },
          h,
        ),
        h,
      ),
    },
    h,
  )

const emptyPageView = (h: HtmlBuilder<Message>): Html =>
  pageView({ toolbar: [], maybeNotice: Option.none(), content: h.empty }, h)

export const view = Submodel.defineView<Model, Message>((model, h) =>
  AsyncData.matchDataSplitEmpty(model.grid, {
    onIdle: () => emptyPageView(h),
    onLoading: () => emptyPageView(h),
    onFailure: error =>
      pageView(
        {
          toolbar: [],
          maybeNotice: Option.none(),
          content: posterFrameView(loadErrorView(error, h), h),
        },
        h,
      ),
    onData: grid => loadedView(model, grid, h),
  }),
)
