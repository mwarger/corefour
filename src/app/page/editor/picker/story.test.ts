import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { expect, test } from 'vitest'

import { zeldaRemakeResult, zeldaResult } from '../../../fixture'
import { SearchItems, WaitBeforeSearch } from './command'
import { Message, OutMessage } from './message'
import { type Model, SearchResultsData, init } from './model'
import { update } from './update'

const withResults = (
  query: string,
  results: ReadonlyArray<typeof zeldaResult>,
): Model => ({
  ...init(),
  query,
  slotIndex: 2,
  results: SearchResultsData.Success({ data: results }),
})

test('typing searches once the pause is over and shows the results', () => {
  story(
    update,
    given(init()),
    message(Message.UpdatedQuery({ value: 'ocarina' })),
    model(({ results }) => {
      expect(results._tag).toBe('Loading')
    }),
    Command.resolve(
      WaitBeforeSearch,
      Message.CompletedWaitBeforeSearch({ generation: 1 }),
    ),
    Command.resolve(
      SearchItems,
      Message.SucceededSearchItems({
        query: 'ocarina',
        results: [zeldaResult, zeldaRemakeResult],
      }),
    ),
    model(({ results }) => {
      expect(AsyncData.getData(results)).toEqual(
        Option.some([zeldaResult, zeldaRemakeResult]),
      )
    }),
  )
})

test('a pause from an earlier keystroke does not search', () => {
  const typedTwice = update(
    update(init(), Message.UpdatedQuery({ value: 'oc' })).model,
    Message.UpdatedQuery({ value: 'oca' }),
  )
  const stalePause = update(
    typedTwice.model,
    Message.CompletedWaitBeforeSearch({ generation: 1 }),
  )

  expect(stalePause.commands ?? []).toHaveLength(0)
})

test('queries shorter than two characters clear results without searching', () => {
  story(
    update,
    given(withResults('oca', [zeldaResult])),
    message(Message.UpdatedQuery({ value: 'o' })),
    model(({ results }) => {
      expect(results._tag).toBe('Idle')
    }),
    Command.expectNone(),
  )
})

test('results for a query the user has moved on from are ignored', () => {
  story(
    update,
    given(withResults('mario', [])),
    message(
      Message.SucceededSearchItems({
        query: 'ocarina',
        results: [zeldaResult],
      }),
    ),
    model(({ results }) => {
      expect(AsyncData.getData(results)).toEqual(Option.some([]))
    }),
  )
})

test('a failed refresh keeps the previous results on screen', () => {
  story(
    update,
    given(withResults('ocarina', [zeldaResult])),
    message(Message.UpdatedQuery({ value: 'ocarina of' })),
    model(({ results }) => {
      expect(results._tag).toBe('Refreshing')
    }),
    Command.resolve(
      WaitBeforeSearch,
      Message.CompletedWaitBeforeSearch({ generation: 1 }),
    ),
    Command.resolve(
      SearchItems,
      Message.FailedSearchItems({
        query: 'ocarina of',
        error: 'Search failed.',
      }),
    ),
    model(({ results }) => {
      expect(results._tag).toBe('Stale')
      expect(AsyncData.getData(results)).toEqual(Option.some([zeldaResult]))
    }),
  )
})

test('pressing Enter picks the first result for the slot being edited', () => {
  story(
    update,
    given(withResults('ocarina', [zeldaResult, zeldaRemakeResult])),
    message(Message.SubmittedSearch()),
    expectOutMessage(
      OutMessage.SelectedResult({ slotIndex: 2, result: zeldaResult }),
    ),
  )
})

test('pressing Enter with no results does nothing', () => {
  story(
    update,
    given(withResults('zzzz', [])),
    message(Message.SubmittedSearch()),
    Command.expectNone(),
  )
})
