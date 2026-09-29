import clsx from 'clsx'
import { Array, Option, String, pipe } from 'effect'
import { AsyncData, Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button, Dialog, Input } from '@foldkit/ui'

import { CATEGORIES } from '../../../../shared/catalog'
import type { SearchResult } from '../../../../shared/schema'
import { coverUrl } from '../../../view/poster'
import { Message } from './message'
import { DIALOG_ID, Model, SEARCH_INPUT_ID } from './model'

const MAX_PLATFORMS = 4

/** e.g. "1998 · Remake · N64, 3DS, Switch +2" */
const resultDetails = ({
  maybeYear,
  maybeKind,
  platforms,
}: SearchResult): string => {
  const shownPlatforms = pipe(
    Array.take(platforms, MAX_PLATFORMS),
    Array.join(', '),
  )
  const hiddenCount = platforms.length - MAX_PLATFORMS
  const platformText = Option.liftPredicate(
    hiddenCount > 0 ? `${shownPlatforms} +${hiddenCount}` : shownPlatforms,
    String.isNonEmpty,
  )
  return pipe(
    [Option.map(maybeYear, year => `${year}`), maybeKind, platformText],
    Array.getSomes,
    Array.join(' · '),
  )
}

const searchErrorView = (error: string, h: HtmlBuilder<Message>): Html =>
  h.p([h.Role('alert'), h.Class('p-4 text-center text-red-700')], [error])

const resultCountText = (count: number): string =>
  count === 1 ? '1 result' : `${count} results`

/** What the always-mounted status region says, and whether to show it. */
const searchStatus = (
  model: Model,
): Readonly<{ text: string; isVisible: boolean }> =>
  AsyncData.match(model.results, {
    onIdle: () => ({ text: '', isVisible: false }),
    onLoading: () => ({ text: 'Searching…', isVisible: true }),
    onRefreshing: () => ({ text: 'Searching…', isVisible: false }),
    onFailure: () => ({ text: '', isVisible: false }),
    onStale: ({ data }) => ({
      text: resultCountText(data.length),
      isVisible: false,
    }),
    onSuccess: results =>
      Array.match(results, {
        onEmpty: () => ({ text: 'Nothing found.', isVisible: true }),
        onNonEmpty: nonEmptyResults => ({
          text: resultCountText(nonEmptyResults.length),
          isVisible: false,
        }),
      }),
  })

// NOTE: the status region stays mounted so screen readers announce each
// change; "N results" is announced but only shown by the list itself.
const searchStatusView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const { text, isVisible } = searchStatus(model)
  return h.p(
    [
      h.Role('status'),
      h.Class(
        clsx({
          'p-4 text-center text-ink/60': isVisible,
          'sr-only': !isVisible,
        }),
      ),
    ],
    [text],
  )
}

const resultItemView = (result: SearchResult, h: HtmlBuilder<Message>): Html =>
  h.keyed('li')(
    result.id,
    [],
    [
      Button.view(
        {
          onClick: Message.ClickedResult({ result }),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left outline-none hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:ring-2 focus-visible:ring-ink/40',
                ),
              ],
              [
                h.img([
                  h.Src(coverUrl(result, 'thumb')),
                  h.Alt(''),
                  h.Loading('lazy'),
                  h.Class('h-16 w-12 shrink-0 rounded object-cover shadow'),
                ]),
                h.span(
                  [h.Class('min-w-0')],
                  [
                    h.span(
                      [h.Class('block truncate font-semibold text-ink')],
                      [result.name],
                    ),
                    h.span(
                      [h.Class('block truncate text-sm text-ink/60')],
                      [resultDetails(result)],
                    ),
                  ],
                ),
              ],
            ),
        },
        h,
      ),
    ],
  )

const resultListView = (
  results: ReadonlyArray<SearchResult>,
  isBusy: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.ul(
    [h.AriaBusy(isBusy), h.Class('p-2')],
    Array.map(results, result => resultItemView(result, h)),
  )

const resultsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('overflow-y-auto')],
    [
      searchStatusView(model, h),
      AsyncData.match(model.results, {
        onIdle: () => h.empty,
        onLoading: () => h.empty,
        onRefreshing: results => resultListView(results, true, h),
        onFailure: error => searchErrorView(error, h),
        onStale: ({ error, data }) =>
          h.div(
            [],
            [searchErrorView(error, h), resultListView(data, false, h)],
          ),
        onSuccess: results => resultListView(results, false, h),
      }),
    ],
  )

const searchFormView = (
  model: Model,
  prompt: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.form(
    [
      h.Class('border-b border-ink/10 p-3'),
      h.OnSubmit(Message.SubmittedSearch()),
    ],
    [
      Input.view(
        {
          id: SEARCH_INPUT_ID,
          value: model.query,
          placeholder: `${prompt}…`,
          onInput: value => Message.UpdatedQuery({ value }),
          toView: attributes =>
            h.input([
              ...attributes.input,
              h.AriaLabel(prompt),
              h.Autocomplete('off'),
              h.Class(
                'w-full rounded-lg bg-white px-4 py-3 text-base text-ink ring-amber-400 outline-none focus-visible:ring-2',
              ),
            ]),
        },
        h,
      ),
    ],
  )

const dialogView = (
  model: Model,
  { dialog, backdrop, panel, title, isVisible }: Dialog.RenderInfo,
  h: HtmlBuilder<Message>,
): Html => {
  const noun = CATEGORIES[model.category].noun
  const slotNumber = model.slotIndex + 1
  // NOTE: Dialog styles the <dialog> itself as a full-screen fixed layer, so
  // layout lives on an inner wrapper that lets clicks through to the backdrop.
  return h.dialog(
    [...dialog, h.Class('bg-transparent')],
    isVisible
      ? [
          h.div([
            ...backdrop,
            h.Class('fixed inset-0 bg-black/40 backdrop-blur-sm'),
          ]),
          h.div(
            [
              h.Class(
                'pointer-events-none relative flex h-full items-start justify-center p-4 pt-[10vh]',
              ),
            ],
            [
              h.div(
                [
                  ...panel,
                  h.Class(
                    'pointer-events-auto flex max-h-[75vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-cream shadow-2xl',
                  ),
                ],
                [
                  h.h2(
                    [...title, h.Class('sr-only')],
                    [`Choose ${noun} #${slotNumber}`],
                  ),
                  searchFormView(model, `Search for ${noun} #${slotNumber}`, h),
                  resultsView(model, h),
                ],
              ),
            ],
          ),
        ]
      : [],
  )
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
  h.submodel({
    slotId: DIALOG_ID,
    model: model.dialog,
    view: Dialog.view,
    viewInputs: { toView: renderInfo => dialogView(model, renderInfo, h) },
    toParentMessage: message => Message.GotDialogMessage({ message }),
  }),
)
