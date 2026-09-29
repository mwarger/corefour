import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import { CategoryId, DEFAULT_CATEGORY } from '../../../../shared/catalog'
import { SearchResults } from '../../../../shared/schema'

export const DIALOG_ID = 'item-picker'
export const SEARCH_INPUT_ID = 'item-picker-search'

export const SearchResultsData = AsyncData.Schema(SearchResults, Schema.String)

export const Model = Schema.Struct({
  dialog: Dialog.Model,
  category: CategoryId,
  slotIndex: Schema.Number,
  query: Schema.String,
  searchGeneration: Schema.Number,
  results: SearchResultsData.schema,
})
export type Model = typeof Model.Type

export const init = (): Model => ({
  dialog: Dialog.init({ id: DIALOG_ID, focusSelector: `#${SEARCH_INPUT_ID}` }),
  category: DEFAULT_CATEGORY,
  slotIndex: 0,
  query: '',
  searchGeneration: 0,
  results: SearchResultsData.Idle(),
})
