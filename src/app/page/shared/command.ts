import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { fetchGrid } from '../../resource/api'
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
