import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { Dialog } from '@foldkit/ui'

import type { Grid } from '../../../shared/schema'
import * as Poster from '../../domain/poster'
import { twoItemGrid, zelda, zeldaResult } from '../../fixture'
import * as PosterDownload from '../../posterDownload'
import {
  CopyShareUrl,
  FocusSlot,
  SaveDraft,
  ShareGrid,
  WaitForLongPress,
} from './command'
import { Message } from './message'
import { Drag, ShareState, init } from './model'
import * as Picker from './picker'
import { update } from './update'

const SHARE_URL = 'http://localhost/g/abc1234567'

const itemNames = (grid: Grid) =>
  grid.items.map(maybeItem =>
    Option.match(maybeItem, { onNone: () => null, onSome: ({ name }) => name }),
  )

const pressedByTouch = modifyFields(init(twoItemGrid), {
  pressGeneration: () => 1,
  drag: () =>
    Drag.Pressing({
      slotIndex: 0,
      pointer: 'Touch',
      generation: 1,
      originX: 100,
      originY: 100,
    }),
})

const sharingFirstVersion = modifyFields(init(twoItemGrid), {
  shareGeneration: () => 1,
  share: () => ShareState.Sharing({ generation: 1 }),
})

describe('picking a game', () => {
  test('a picked search result fills the slot and saves the draft', () => {
    story(
      update,
      given(init(Poster.empty())),
      message(Message.ClickedSlot({ slotIndex: 2 })),
      Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
      message(
        Message.GotPickerMessage({
          message: Picker.Message.ClickedResult({ result: zeldaResult }),
        }),
      ),
      model(({ grid }) => {
        expect(Poster.itemAt(grid, 2)).toEqual(Option.some(zelda))
      }),
      Command.expectHas(
        SaveDraft({
          grid: Poster.setItem(2, Option.some(zelda))(Poster.empty()),
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

  test('starting over clears every slot', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(Message.ClickedStartOver()),
      model(({ grid }) => {
        expect(grid).toEqual(Poster.empty())
      }),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
    )
  })
})

describe('dragging with a mouse', () => {
  test('a small wobble stays a press, so the click still opens the picker', () => {
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

  test('dropping on another slot swaps the games', () => {
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
      model(({ drag }) => {
        expect(drag).toEqual(
          Drag.Dragging({
            slotIndex: 1,
            pointer: 'Mouse',
            originX: 300,
            originY: 100,
            currentX: 100,
            currentY: 100,
            maybeTargetIndex: Option.some(0),
          }),
        )
      }),
      message(Message.ReleasedPointer()),
      model(({ grid, drag }) => {
        expect(itemNames(grid)).toEqual(['Crazy Taxi', zelda.name, null, null])
        expect(drag._tag).toBe('Idle')
      }),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
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
      model(({ grid, drag }) => {
        expect(grid).toEqual(twoItemGrid)
        expect(drag._tag).toBe('Idle')
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
        Message.CompletedWaitForLongPress({ generation: 1 }),
      ),
      model(({ drag }) => {
        expect(drag._tag).toBe('Dragging')
      }),
    )
  })

  test('moving before the long press lets the page scroll instead', () => {
    story(
      update,
      given(pressedByTouch),
      message(
        Message.MovedPointer({
          clientX: 100,
          clientY: 140,
          maybeTargetIndex: Option.none(),
        }),
      ),
      model(({ drag }) => {
        expect(drag._tag).toBe('Idle')
      }),
      message(Message.CompletedWaitForLongPress({ generation: 1 })),
      model(({ drag }) => {
        expect(drag._tag).toBe('Idle')
      }),
    )
  })

  test('the browser cancelling the touch ends the press', () => {
    story(
      update,
      given(pressedByTouch),
      message(Message.CancelledPointer()),
      model(({ drag }) => {
        expect(drag._tag).toBe('Idle')
      }),
    )
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
        expect(share).toEqual(ShareState.Sharing({ generation: 1 }))
      }),
      Command.resolve(
        ShareGrid,
        Message.SucceededShareGrid({ generation: 1, url: SHARE_URL }),
      ),
      Command.resolve(
        CopyShareUrl,
        Message.SucceededCopyShareUrl({ url: SHARE_URL }),
      ),
      model(({ share }) => {
        expect(share).toEqual(
          ShareState.Shared({ url: SHARE_URL, clipboard: 'Copied' }),
        )
      }),
    )
  })

  test('a blocked clipboard still shows the link, without claiming it was copied', () => {
    story(
      update,
      given(init(twoItemGrid)),
      message(Message.ClickedShareLink()),
      Command.resolve(
        ShareGrid,
        Message.SucceededShareGrid({ generation: 1, url: SHARE_URL }),
      ),
      Command.resolve(
        CopyShareUrl,
        Message.FailedCopyShareUrl({ url: SHARE_URL }),
      ),
      model(({ share }) => {
        expect(share).toEqual(
          ShareState.Shared({ url: SHARE_URL, clipboard: 'NotCopied' }),
        )
      }),
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
          generation: 1,
          error: 'Too many shares. Try again in a minute.',
        }),
      ),
      model(({ share }) => {
        expect(share).toEqual(
          ShareState.Failed({
            error: 'Too many shares. Try again in a minute.',
          }),
        )
      }),
    )
  })

  // NOTE: stories resolve every Command before the next Message, so these
  // start from the moment right after "Share link" was clicked.
  test('a share that finishes after the poster was edited is ignored', () => {
    story(
      update,
      given(sharingFirstVersion),
      message(Message.SelectedSubtitle({ subtitleId: 'comfort' })),
      model(({ share }) => {
        expect(share).toEqual(ShareState.Idle())
      }),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
      message(Message.SucceededShareGrid({ generation: 1, url: SHARE_URL })),
      model(({ share }) => {
        expect(share).toEqual(ShareState.Idle())
      }),
      Command.expectNone(),
    )
  })

  test('a share that fails after the poster was edited is ignored too', () => {
    story(
      update,
      given(sharingFirstVersion),
      message(Message.ClickedRemoveItem({ slotIndex: 1 })),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
      message(
        Message.FailedShareGrid({ generation: 1, error: 'Sharing failed.' }),
      ),
      model(({ share }) => {
        expect(share).toEqual(ShareState.Idle())
      }),
    )
  })

  test('an empty poster cannot be shared', () => {
    story(
      update,
      given(init(Poster.empty())),
      message(Message.ClickedShareLink()),
      Command.expectNone(),
    )
  })

  test('editing the poster drops the share link and any download error', () => {
    story(
      update,
      given(
        modifyFields(init(twoItemGrid), {
          share: () =>
            ShareState.Shared({ url: SHARE_URL, clipboard: 'Copied' }),
          posterDownload: () =>
            PosterDownload.Model.Failed({
              error: "Couldn't create the image.",
            }),
        }),
      ),
      message(Message.SelectedSubtitle({ subtitleId: 'comfort' })),
      model(({ share, posterDownload, grid }) => {
        expect(share).toEqual(ShareState.Idle())
        expect(posterDownload).toEqual(PosterDownload.Model.Idle())
        expect(grid.subtitle).toBe('comfort')
      }),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
    )
  })
})
