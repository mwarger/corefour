import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { downloadPosterPng } from '../resource/posterImage'
import { Message } from './message'

export const DownloadPoster = Command.define('DownloadPoster', {
  args: { filename: Schema.String },
  messages: [Message.SucceededDownloadPoster, Message.FailedDownloadPoster],
  execute: ({ filename }) =>
    downloadPosterPng(filename).pipe(
      Effect.as(Message.SucceededDownloadPoster()),
      Effect.catch(({ message }) =>
        Effect.succeed(Message.FailedDownloadPoster({ error: message })),
      ),
    ),
})
