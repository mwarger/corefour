import { defineMessageUnion } from 'foldkit/message'

import { Grid } from '../../../shared/schema'
import * as PosterDownload from '../../posterDownload'
import { LoadError } from './model'

// MESSAGE

export const Message = defineMessageUnion({
  SucceededFetchGrid: { grid: Grid },
  FailedFetchGrid: { error: LoadError },
  ClickedRemix: {},
  GotPosterDownloadMessage: { message: PosterDownload.Message },
})
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  RequestedRemix: { grid: Grid },
})
export type OutMessage = typeof OutMessage.Type
