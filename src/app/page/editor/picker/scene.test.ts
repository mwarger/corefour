import { Command, Mount, expect, given, role, scene, text } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { Dialog } from '@foldkit/ui'

import { zeldaRemakeResult, zeldaResult } from '../../../fixture'
import { SearchResultsData, init } from './model'
import { open, update } from './update'
import { view } from './view'

const openPicker = open({ slotIndex: 0, category: 'Games' })(init()).model

const withResults = (results: typeof SearchResultsData.schema.Type) =>
  modifyFields(openPicker, {
    query: () => 'ocarina',
    results: () => results,
  })

const resolveDialogResources = Mount.resolve(
  Dialog.AcquireResources,
  Dialog.Message.SucceededAcquireResources(),
)

describe('picker', () => {
  test('shows a searching state before the first results', () => {
    scene(
      { update, view },
      given(withResults(SearchResultsData.Loading())),
      resolveDialogResources,
      expect(role('heading', { name: 'Choose game #1' })).toExist(),
      expect(role('status')).toHaveText('Searching…'),
    )
  })

  test('lists results with their year, kind and platforms', () => {
    scene(
      { update, view },
      given(
        withResults(
          SearchResultsData.Success({ data: [zeldaResult, zeldaRemakeResult] }),
        ),
      ),
      resolveDialogResources,
      expect(text('1998 · N64, Wii, 3DS, WiiU +2')).toExist(),
      expect(text('2011 · Remake · 3DS')).toExist(),
    )
  })

  test('says when nothing matches', () => {
    scene(
      { update, view },
      given(withResults(SearchResultsData.Success({ data: [] }))),
      resolveDialogResources,
      expect(role('status')).toHaveText('Nothing found.'),
    )
  })

  test('shows why a search failed', () => {
    scene(
      { update, view },
      given(
        withResults(
          SearchResultsData.Failure({
            error: 'Search failed. Try again in a moment.',
          }),
        ),
      ),
      resolveDialogResources,
      expect(role('alert')).toHaveText('Search failed. Try again in a moment.'),
      Command.expectNone(),
    )
  })
})
