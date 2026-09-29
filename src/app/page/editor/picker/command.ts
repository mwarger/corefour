import { Duration, Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { CategoryId } from '../../../../shared/catalog'
import { searchItems } from '../../../resource/api'
import { Message } from './message'

const SEARCH_DEBOUNCE = Duration.millis(250)

export const WaitBeforeSearch = Command.define('WaitBeforeSearch', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedWaitBeforeSearch],
  execute: ({ generation }) =>
    Effect.sleep(SEARCH_DEBOUNCE).pipe(
      Effect.as(Message.CompletedWaitBeforeSearch({ generation })),
    ),
})

export const SearchItems = Command.define('SearchItems', {
  args: { category: CategoryId, query: Schema.String },
  messages: [Message.SucceededSearchItems, Message.FailedSearchItems],
  execute: ({ category, query }) =>
    searchItems(category, query).pipe(
      Effect.map(results => Message.SucceededSearchItems({ query, results })),
      Effect.catch(({ message }) =>
        Effect.succeed(Message.FailedSearchItems({ query, error: message })),
      ),
    ),
})
