import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Grid } from '../../../shared/schema'
import { LoadError } from './model'

export const Message = defineMessageUnion({
  SucceededFetchGrid: { grid: Grid },
  FailedFetchGrid: { error: LoadError },
  ClickedRemix: {},
  ClickedDownloadPng: {},
  SucceededExportPoster: {},
  FailedExportPoster: { error: Schema.String },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  RequestedRemix: { grid: Grid },
})
export type OutMessage = typeof OutMessage.Type
