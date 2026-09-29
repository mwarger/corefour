import { Array, Duration, Effect, Option, Schema, pipe } from 'effect'
import { Command, Dom } from 'foldkit'

import { Grid, ShareRequest } from '../../../shared/schema'
import { shareGrid } from '../../resource/api'
import { saveDraft } from '../../resource/draftStorage'
import { exportPosterPng } from '../../resource/posterImage'
import { getTurnstileToken } from '../../resource/turnstile'
import { sharedRouter } from '../../route'
import { POSTER_ELEMENT_ID } from '../../view/poster'
import { Message } from './message'

const LONG_PRESS = Duration.millis(250)

export const slotButtonId = (slotIndex: number): string =>
  `slot-button-${slotIndex}`

export const SaveDraft = Command.define('SaveDraft', {
  args: { grid: Grid },
  messages: [Message.CompletedSaveDraft],
  execute: ({ grid }) =>
    saveDraft(grid).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedSaveDraft()),
    ),
})

export const ExportPoster = Command.define('ExportPoster', {
  args: { filename: Schema.String },
  messages: [Message.SucceededExportPoster, Message.FailedExportPoster],
  execute: ({ filename }) =>
    exportPosterPng(POSTER_ELEMENT_ID, filename).pipe(
      Effect.as(Message.SucceededExportPoster()),
      Effect.catch(({ message }) =>
        Effect.succeed(Message.FailedExportPoster({ error: message })),
      ),
    ),
})

export const ShareGrid = Command.define('ShareGrid', {
  args: { grid: Grid },
  messages: [Message.SucceededShareGrid, Message.FailedShareGrid],
  execute: ({ grid }) =>
    Effect.gen(function* () {
      const turnstileToken = yield* getTurnstileToken
      const id = yield* shareGrid(
        ShareRequest.make({
          category: grid.category,
          subtitle: grid.subtitle,
          theme: grid.theme,
          items: Array.map(
            grid.items,
            Option.map(({ source, id }) => ({ source, id })),
          ),
          turnstileToken,
        }),
      )
      const url = new URL(sharedRouter({ id }), window.location.origin).href
      return Message.SucceededShareGrid({ url })
    }).pipe(
      Effect.catch(({ message }) =>
        Effect.succeed(Message.FailedShareGrid({ error: message })),
      ),
    ),
})

export const CopyShareUrl = Command.define('CopyShareUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedCopyShareUrl],
  execute: ({ url }) =>
    Effect.tryPromise(() => navigator.clipboard.writeText(url)).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedCopyShareUrl()),
    ),
})

export const WaitForLongPress = Command.define('WaitForLongPress', {
  args: { pressId: Schema.Number },
  messages: [Message.CompletedWaitForLongPress],
  execute: ({ pressId }) =>
    Effect.sleep(LONG_PRESS).pipe(
      Effect.as(Message.CompletedWaitForLongPress({ pressId })),
    ),
})

export const FocusSlot = Command.define('FocusSlot', {
  args: { slotIndex: Schema.Number },
  messages: [Message.CompletedFocusSlot],
  execute: ({ slotIndex }) =>
    pipe(
      Dom.focus(`#${slotButtonId(slotIndex)}`),
      Effect.ignore,
      Effect.as(Message.CompletedFocusSlot()),
    ),
})
