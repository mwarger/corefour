import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { fetchGrid } from '../../resource/api'
import { exportPosterPng } from '../../resource/posterImage'
import { POSTER_ELEMENT_ID } from '../../view/poster'
import { Message } from './message'

export const FetchGrid = Command.define('FetchGrid', {
  args: { gridId: Schema.String },
  messages: [Message.SucceededFetchGrid, Message.FailedFetchGrid],
  execute: ({ gridId }) =>
    fetchGrid(gridId).pipe(
      Effect.map(grid => Message.SucceededFetchGrid({ grid })),
      Effect.catchTags({
        GridNotFoundError: () =>
          Effect.succeed(Message.FailedFetchGrid({ error: 'NotFound' })),
        ApiError: () =>
          Effect.succeed(Message.FailedFetchGrid({ error: 'Unavailable' })),
      }),
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
