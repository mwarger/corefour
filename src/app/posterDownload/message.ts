import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedDownload: { filename: Schema.String },
  SucceededDownloadPoster: {},
  FailedDownloadPoster: { error: Schema.String },
})
export type Message = typeof Message.Type
