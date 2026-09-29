import type { Update } from 'foldkit'

import { DownloadPoster } from './command'
import { Message } from './message'
import { Model } from './model'

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedDownload: ({ filename }) =>
      model._tag === 'Downloading'
        ? { model }
        : {
            model: Model.Downloading(),
            commands: [DownloadPoster({ filename })],
          },

    SucceededDownloadPoster: () => ({ model: Model.Idle() }),

    FailedDownloadPoster: ({ error }) => ({ model: Model.Failed({ error }) }),
  })
