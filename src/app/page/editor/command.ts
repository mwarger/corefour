import { Duration, Effect, Option, Schema, pipe } from 'effect'
import { Command, Dom } from 'foldkit'

import { Grid } from '../../../shared/schema'
import * as Poster from '../../domain/poster'
import { ApiError, shareGrid } from '../../resource/api'
import { saveDraft } from '../../resource/draftStorage'
import { getTurnstileToken } from '../../resource/turnstile'
import { sharedRouter } from '../../route'
import { slotButtonId } from './constant'
import { Message } from './message'

const LONG_PRESS = Duration.millis(250)

const INVALID_POSTER = "This poster can't be shared. Try starting over."

export const SaveDraft = Command.define('SaveDraft', {
  args: { grid: Grid },
  messages: [Message.CompletedSaveDraft],
  execute: ({ grid }) =>
    saveDraft(grid).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedSaveDraft()),
    ),
})

export const ShareGrid = Command.define('ShareGrid', {
  args: { grid: Grid, generation: Schema.Number },
  messages: [Message.SucceededShareGrid, Message.FailedShareGrid],
  execute: ({ grid, generation }) =>
    Effect.gen(function* () {
      const turnstileToken = yield* getTurnstileToken
      const request = yield* Option.match(
        Poster.toShareRequest(grid, turnstileToken),
        {
          onNone: () => Effect.fail(new ApiError({ message: INVALID_POSTER })),
          onSome: Effect.succeed,
        },
      )
      const id = yield* shareGrid(request)
      const url = new URL(sharedRouter({ id }), window.location.origin).href
      return Message.SucceededShareGrid({ generation, url })
    }).pipe(
      Effect.catch(({ message }) =>
        Effect.succeed(Message.FailedShareGrid({ generation, error: message })),
      ),
    ),
})

export const CopyShareUrl = Command.define('CopyShareUrl', {
  args: { url: Schema.String },
  messages: [Message.SucceededCopyShareUrl, Message.FailedCopyShareUrl],
  execute: ({ url }) =>
    Effect.tryPromise(() => navigator.clipboard.writeText(url)).pipe(
      Effect.as(Message.SucceededCopyShareUrl({ url })),
      Effect.catch(() => Effect.succeed(Message.FailedCopyShareUrl({ url }))),
    ),
})

export const WaitForLongPress = Command.define('WaitForLongPress', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedWaitForLongPress],
  execute: ({ generation }) =>
    Effect.sleep(LONG_PRESS).pipe(
      Effect.as(Message.CompletedWaitForLongPress({ generation })),
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
