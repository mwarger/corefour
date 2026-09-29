import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { downloadPosterPng } from '../resource/posterDownload'
import { POSTER_ELEMENT_ID } from '../view/poster'
import { Message } from './message'

export const DownloadPoster = Command.define('DownloadPoster', {
  args: { filename: Schema.String },
  messages: [Message.SucceededDownloadPoster, Message.FailedDownloadPoster],
  execute: ({ filename }) =>
    downloadPosterPng(POSTER_ELEMENT_ID, filename).pipe(
      Effect.as(Message.SucceededDownloadPoster()),
      Effect.catch(({ message }) =>
        Effect.succeed(Message.FailedDownloadPoster({ error: message })),
      ),
    ),
})
