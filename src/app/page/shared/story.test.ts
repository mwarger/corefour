import { expectOutMessage, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { twoItemGrid } from '../../fixture'
import { FetchGrid } from './command'
import { Message, OutMessage } from './message'
import { GridData } from './model'
import { init, update } from './update'

test('opening a shared poster fetches it', () => {
  const init_ = init('abc1234567')

  expect(init_.model.grid).toEqual(GridData.Loading())
  expect(init_.commands?.map(({ name, args }) => ({ name, args }))).toEqual([
    { name: FetchGrid.name, args: { gridId: 'abc1234567' } },
  ])
})

test('a loaded poster is shown', () => {
  story(
    update,
    given(init('abc1234567').model),
    message(Message.SucceededFetchGrid({ grid: twoItemGrid })),
    model(({ grid }) => {
      expect(grid).toEqual(GridData.Success({ data: twoItemGrid }))
    }),
  )
})

test('a poster that does not exist is reported as not found', () => {
  story(
    update,
    given(init('missing000').model),
    message(Message.FailedFetchGrid({ error: 'NotFound' })),
    model(({ grid }) => {
      expect(grid).toEqual(GridData.Failure({ error: 'NotFound' }))
    }),
  )
})

test('remixing hands the poster to the editor', () => {
  story(
    update,
    given({
      ...init('abc1234567').model,
      grid: GridData.Success({ data: twoItemGrid }),
    }),
    message(Message.ClickedRemix()),
    expectOutMessage(OutMessage.RequestedRemix({ grid: twoItemGrid })),
  )
})
