import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'

import { SearchResult, SearchResults } from '../../../../shared/schema'

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  CompletedWaitBeforeSearch: { generation: Schema.Number },
  SucceededSearchItems: { query: Schema.String, results: SearchResults },
  FailedSearchItems: { query: Schema.String, error: Schema.String },
  ClickedResult: { result: SearchResult },
  SubmittedSearch: {},
  GotDialogMessage: { message: Dialog.Message },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SelectedResult: { slotIndex: Schema.Number, result: SearchResult },
})
export type OutMessage = typeof OutMessage.Type
