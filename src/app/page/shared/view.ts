import { Array, Match, Option } from 'effect'
import { AsyncData, Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Grid } from '../../../shared/schema'
import * as Poster from '../../domain/poster'
import * as PosterDownload from '../../posterDownload'
import { editorRouter } from '../../route'
import {
  actionButtonView,
  errorNoticeView,
  messagePageView,
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

const loadErrorHeading = (error: LoadError): string =>
  Match.value(error).pipe(
    Match.when('NotFound', () => "This poster doesn't exist."),
    Match.when('Unavailable', () => "Couldn't load this poster."),
    Match.exhaustive,
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
        h.submodel({
          slotId: 'poster-download',
          model: model.posterDownload,
          view: PosterDownload.view,
          viewInputs: {
            filename: Poster.posterFilename(grid),
            isPrimary: true,
            isDisabled: false,
          },
          toParentMessage: message =>
            Message.GotPosterDownloadMessage({ message }),
        }),
      ],
      notices: Array.fromOption(
        Option.map(PosterDownload.maybeError(model.posterDownload), error =>
          errorNoticeView(error, h),
        ),
      ),
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

export const view = Submodel.defineView<Model, Message>((model, h) =>
  AsyncData.matchData(model.grid, {
    onEmpty: () => messagePageView('Loading poster…', false, h),
    onFailure: error => messagePageView(loadErrorHeading(error), true, h),
    onData: grid => loadedView(model, grid, h),
  }),
)
