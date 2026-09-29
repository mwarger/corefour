import { Option } from 'effect'
import { expectOutMessage, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect, test } from 'vitest'

import { twoItemGrid } from '../../fixture'
import { FetchGrid } from './command'
import { Message, OutMessage } from './message'
import { GridData } from './model'
import { init, isShowing, update } from './update'

const loading = init('abc1234567').model

test('opening a shared poster fetches it', () => {
  const init_ = init('abc1234567')

  expect(init_.model.grid).toEqual(GridData.Loading())
  expect(init_.model.maybeGridId).toEqual(Option.some('abc1234567'))
  expect(init_.commands?.map(({ name, args }) => ({ name, args }))).toEqual([
    { name: FetchGrid.name, args: { gridId: 'abc1234567' } },
  ])
})

test('a loaded poster is shown', () => {
  story(
    update,
    given(loading),
    message(Message.SucceededFetchGrid({ grid: twoItemGrid })),
    model(({ grid }) => {
      expect(grid).toEqual(GridData.Success({ data: twoItemGrid }))
    }),
  )
})

test('a poster that does not exist is reported as not found', () => {
  story(
    update,
    given(loading),
    message(Message.FailedFetchGrid({ error: 'NotFound' })),
    model(({ grid }) => {
      expect(grid).toEqual(GridData.Failure({ error: 'NotFound' }))
    }),
  )
})

test('a failed load is retried when the poster is opened again', () => {
  const failed = modifyFields(loading, {
    grid: () => GridData.Failure({ error: 'Unavailable' }),
  })

  expect(isShowing(loading, 'abc1234567')).toBe(true)
  expect(isShowing(failed, 'abc1234567')).toBe(false)
})

test('remixing hands the poster to the editor', () => {
  story(
    update,
    given(
      modifyFields(loading, {
        grid: () => GridData.Success({ data: twoItemGrid }),
      }),
    ),
    message(Message.ClickedRemix()),
    expectOutMessage(OutMessage.RequestedRemix({ grid: twoItemGrid })),
  )
})
