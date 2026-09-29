import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Dialog } from '@foldkit/ui'

import * as GridDomain from '../../domain/grid'
import { twoItemGrid, zelda, zeldaResult } from '../../fixture'
import {
  CopyShareUrl,
  ExportPoster,
  FocusSlot,
  SaveDraft,
  ShareGrid,
  WaitForLongPress,
} from './command'
import { Message } from './message'
import { init } from './model'
import * as Picker from './picker'
import { update } from './update'

const SHARE_URL = 'http://localhost/g/abc1234567'

const itemNames = (grid: typeof twoItemGrid) =>
  grid.items.map(maybeItem =>
    Option.match(maybeItem, { onNone: () => null, onSome: ({ name }) => name }),
  )

describe('picking a game', () => {
  test('a picked search result fills the slot and saves the draft', () => {
    story(
      update,
      given(init(GridDomain.empty())),
      message(Message.ClickedSlot({ slotIndex: 2 })),
      Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
      message(
        Message.GotPickerMessage({
          message: Picker.Message.ClickedResult({ result: zeldaResult }),
        }),
      ),
      model(({ grid }) => {
        expect(GridDomain.itemAt(grid, 2)).toEqual(Option.some(zelda))
      }),
      Command.expectHas(
        SaveDraft({
          grid: GridDomain.setItem(2, Option.some(zelda))(GridDomain.empty()),
        }),
      ),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
      Command.resolve(
        Dialog.CloseDialog,
        Dialog.Message.CompletedCloseDialog(),
      ),
    )
  })

  test('removing a game empties its slot', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(Message.ClickedRemoveItem({ slotIndex: 0 })),
      model(({ grid }) => {
        expect(itemNames(grid)).toEqual([null, 'Crazy Taxi', null, null])
      }),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
    )
  })
})

describe('dragging with a mouse', () => {
  test('a small wobble is still a click, not a drag', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(
        Message.PressedSlot({
          slotIndex: 1,
          pointer: 'Mouse',
          clientX: 100,
          clientY: 100,
        }),
      ),
      message(
        Message.MovedPointer({
          clientX: 103,
          clientY: 102,
          maybeTargetIndex: Option.none(),
        }),
      ),
      model(({ drag }) => {
        expect(drag._tag).toBe('Pressing')
      }),
      message(Message.ReleasedPointer()),
      message(Message.ClickedSlot({ slotIndex: 1 })),
      model(({ drag, picker }) => {
        expect(drag._tag).toBe('Idle')
        expect(picker.dialog.isOpen).toBe(true)
      }),
      Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
    )
  })

  test('dropping on another slot swaps the games and swallows the click', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(
        Message.PressedSlot({
          slotIndex: 1,
          pointer: 'Mouse',
          clientX: 300,
          clientY: 100,
        }),
      ),
      message(
        Message.MovedPointer({
          clientX: 100,
          clientY: 100,
          maybeTargetIndex: Option.some(0),
        }),
      ),
      message(
        Message.MovedPointer({
          clientX: 90,
          clientY: 100,
          maybeTargetIndex: Option.some(0),
        }),
      ),
      model(({ drag }) => {
        expect(drag._tag).toBe('Dragging')
      }),
      message(Message.ReleasedPointer()),
      model(({ grid, drag }) => {
        expect(itemNames(grid)).toEqual(['Crazy Taxi', zelda.name, null, null])
        expect(drag._tag).toBe('JustDropped')
      }),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
      message(Message.ClickedSlot({ slotIndex: 1 })),
      model(({ drag, picker }) => {
        expect(drag._tag).toBe('Idle')
        expect(picker.dialog.isOpen).toBe(false)
      }),
    )
  })

  test('releasing outside any slot leaves the poster unchanged', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(
        Message.PressedSlot({
          slotIndex: 0,
          pointer: 'Mouse',
          clientX: 100,
          clientY: 100,
        }),
      ),
      message(
        Message.MovedPointer({
          clientX: 400,
          clientY: 900,
          maybeTargetIndex: Option.none(),
        }),
      ),
      message(Message.ReleasedPointer()),
      model(({ grid }) => {
        expect(grid).toEqual(twoItemGrid)
      }),
      Command.expectNone(),
    )
  })

  test('empty slots cannot be dragged', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(
        Message.PressedSlot({
          slotIndex: 3,
          pointer: 'Mouse',
          clientX: 100,
          clientY: 100,
        }),
      ),
      model(({ drag }) => {
        expect(drag._tag).toBe('Idle')
      }),
    )
  })
})

describe('dragging with touch', () => {
  test('a long press starts the drag', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(
        Message.PressedSlot({
          slotIndex: 0,
          pointer: 'Touch',
          clientX: 100,
          clientY: 100,
        }),
      ),
      Command.resolve(
        WaitForLongPress,
        Message.CompletedWaitForLongPress({ pressId: 1 }),
      ),
      model(({ drag }) => {
        expect(drag._tag).toBe('Dragging')
      }),
    )
  })

  test('moving before the long press lets the page scroll instead', () => {
    const pressed = update(
      init(twoItemGrid),
      Message.PressedSlot({
        slotIndex: 0,
        pointer: 'Touch',
        clientX: 100,
        clientY: 100,
      }),
    )
    const scrolled = update(
      pressed.model,
      Message.MovedPointer({
        clientX: 100,
        clientY: 140,
        maybeTargetIndex: Option.none(),
      }),
    )
    const lateLongPress = update(
      scrolled.model,
      Message.CompletedWaitForLongPress({ pressId: 1 }),
    )

    expect(scrolled.model.drag._tag).toBe('Idle')
    expect(lateLongPress.model.drag._tag).toBe('Idle')
  })
})

describe('moving with the keyboard', () => {
  test('Shift+arrow swaps with the neighbor, announces it, and keeps focus on the game', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(Message.PressedMoveKey({ slotIndex: 0, direction: 'Down' })),
      model(({ grid, maybeAnnouncement }) => {
        expect(itemNames(grid)).toEqual([null, 'Crazy Taxi', zelda.name, null])
        expect(maybeAnnouncement).toEqual(
          Option.some(`Moved ${zelda.name} to position 3`),
        )
      }),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
      Command.resolve(FocusSlot, Message.CompletedFocusSlot()),
    )
  })

  test('moving off the edge of the grid does nothing', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(Message.PressedMoveKey({ slotIndex: 0, direction: 'Left' })),
      model(({ grid }) => {
        expect(grid).toEqual(twoItemGrid)
      }),
      Command.expectNone(),
    )
  })
})

describe('sharing', () => {
  test('a successful share shows the link and copies it', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(Message.ClickedShareLink()),
      model(({ share }) => {
        expect(share._tag).toBe('Sharing')
      }),
      Command.resolve(
        ShareGrid,
        Message.SucceededShareGrid({ url: SHARE_URL }),
      ),
      model(({ share }) => {
        expect(share).toEqual({ _tag: 'Shared', url: SHARE_URL })
      }),
      Command.resolve(CopyShareUrl, Message.CompletedCopyShareUrl()),
    )
  })

  test('a failed share shows why', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(Message.ClickedShareLink()),
      Command.resolve(
        ShareGrid,
        Message.FailedShareGrid({
          error: 'Too many shares. Try again in a minute.',
        }),
      ),
      model(({ share }) => {
        expect(share).toEqual({
          _tag: 'Failed',
          error: 'Too many shares. Try again in a minute.',
        })
      }),
    )
  })

  test('an empty poster cannot be shared', () => {
    story(
      update,
      given(init(GridDomain.empty())),
      message(Message.ClickedShareLink()),
      Command.expectNone(),
    )
  })

  test('editing the poster drops the old share link', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(Message.ClickedShareLink()),
      Command.resolve(
        ShareGrid,
        Message.SucceededShareGrid({ url: SHARE_URL }),
      ),
      Command.resolve(CopyShareUrl, Message.CompletedCopyShareUrl()),
      message(Message.SelectedSubtitle({ subtitleId: 'comfort' })),
      model(({ share, grid }) => {
        expect(share._tag).toBe('Idle')
        expect(grid.subtitle).toBe('comfort')
      }),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
    )
  })
})

describe('downloading the image', () => {
  test('exporting names the file after the poster', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(Message.ClickedDownloadPng()),
      Command.expectExact(ExportPoster({ filename: 'my-core-four.png' })),
      Command.resolve(ExportPoster, Message.SucceededExportPoster()),
      model(({ imageExport }) => {
        expect(imageExport._tag).toBe('Idle')
      }),
    )
  })

  test('a failed export says so', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(Message.ClickedDownloadPng()),
      Command.resolve(
        ExportPoster,
        Message.FailedExportPoster({ error: "Couldn't create the image." }),
      ),
      model(({ imageExport }) => {
        expect(imageExport).toEqual({
          _tag: 'Failed',
          error: "Couldn't create the image.",
        })
      }),
    )
  })
})

test('starting over clears every slot', () => {
  story(
    update,
    given(init(twoItemGrid)),
    message(Message.ClickedStartOver()),
    model(({ grid }) => {
      expect(grid).toEqual(GridDomain.empty())
    }),
    Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
  )
})
