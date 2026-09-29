import { Array, Match, Option } from 'effect'
import { Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { GRID_SIZE } from '../../../../shared/schema'
import * as Poster from '../../../domain/poster'
import * as PosterDownload from '../../../posterDownload'
import {
  actionButtonView,
  errorNoticeView,
  pageView,
  posterFrameView,
} from '../../../view/layout'
import { posterView } from '../../../view/poster'
import { MOVE_HINT_ID } from '../constant'
import { Message } from '../message'
import { type Clipboard, Model, ShareState } from '../model'
import * as Picker from '../picker'
import { slotView, subtitlePickerView } from './slot'

const clipboardLabel = (clipboard: Clipboard): string =>
  Match.value(clipboard).pipe(
    Match.when('Copying', () => 'Copying link: '),
    Match.when('Copied', () => 'Link copied: '),
    Match.when('NotCopied', () => 'Share link: '),
    Match.exhaustive,
  )

const shareLinkNoticeView = (
  url: string,
  clipboard: Clipboard,
  h: HtmlBuilder<Message>,
): Html =>
  h.p(
    [],
    [
      clipboardLabel(clipboard),
      h.a([h.Href(url), h.Class('font-semibold break-all underline')], [url]),
    ],
  )

const shareNoticeView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Option.Option<Html> =>
  ShareState.matchOrElse<Option.Option<Html>>(
    model.share,
    {
      Shared: ({ url, clipboard }) =>
        Option.some(shareLinkNoticeView(url, clipboard, h)),
      Failed: ({ error }) => Option.some(errorNoticeView(error, h)),
    },
    () => Option.none(),
  )

const noticesView = (
  model: Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> =>
  Array.getSomes([
    shareNoticeView(model, h),
    Option.map(PosterDownload.maybeError(model.posterDownload), error =>
      errorNoticeView(error, h),
    ),
  ])

const toolbarView = (
  model: Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  const filledCount = Poster.filledCount(model.grid)
  const isEmpty = filledCount === 0
  return [
    h.span(
      [h.Class('mr-auto font-semibold')],
      [`${filledCount} / ${GRID_SIZE} picked`],
    ),
    actionButtonView(
      {
        label: 'Start over',
        onClick: Message.ClickedStartOver(),
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
        filename: Poster.posterFilename(model.grid),
        isPrimary: false,
        isDisabled: isEmpty,
      },
      toParentMessage: message => Message.GotPosterDownloadMessage({ message }),
    }),
    actionButtonView(
      {
        label: 'Share link',
        onClick: Message.ClickedShareLink(),
        isPrimary: true,
        isBusy: model.share._tag === 'Sharing',
        isDisabled: isEmpty,
      },
      h,
    ),
  ]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
  pageView(
    {
      toolbar: toolbarView(model, h),
      notices: noticesView(model, h),
      content: h.div(
        [h.Class('w-full')],
        [
          posterFrameView(
            posterView(
              {
                grid: model.grid,
                subtitle: subtitlePickerView(model, h),
                slots: Array.map(model.grid.items, (maybeItem, slotIndex) =>
                  slotView(model, maybeItem, slotIndex, h),
                ),
              },
              h,
            ),
            h,
          ),
          h.p(
            [h.Id(MOVE_HINT_ID), h.Class('sr-only')],
            ['Shift and arrow keys move it to a neighboring slot.'],
          ),
          h.div(
            [h.AriaLive('polite'), h.Class('sr-only')],
            [Option.getOrElse(model.maybeAnnouncement, () => '')],
          ),
          h.submodel({
            slotId: 'picker',
            model: model.picker,
            view: Picker.view,
            toParentMessage: message => Message.GotPickerMessage({ message }),
          }),
        ],
      ),
    },
    h,
  ),
)
