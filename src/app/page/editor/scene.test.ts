import { Option } from 'effect'
import {
  Command,
  Mount,
  click,
  expect,
  expectIgnored,
  given,
  keydown,
  label,
  role,
  scene,
  selector,
  text,
  type,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { Dialog } from '@foldkit/ui'

import * as Poster from '../../domain/poster'
import { twoItemGrid, zelda, zeldaResult } from '../../fixture'
import * as PosterDownload from '../../posterDownload'
import { DownloadPoster } from '../../posterDownload/command'
import { CopyShareUrl, FocusSlot, SaveDraft, ShareGrid } from './command'
import { Message } from './message'
import { Drag, init } from './model'
import * as Picker from './picker'
import { SearchItems, WaitBeforeSearch } from './picker/command'
import { update } from './update'
import { view } from './view'

const SHARE_URL = 'http://localhost/g/abc1234567'

const resolveDialogResources = Mount.resolve(
  Dialog.AcquireResources,
  Dialog.Message.SucceededAcquireResources(),
)

describe('editor', () => {
  test('an empty poster offers four slots and disables sharing', () => {
    scene(
      { update, view },
      given(init(Poster.empty())),
      expect(role('heading', { name: 'My Core Four' })).toExist(),
      expect(text('0 / 4 picked')).toExist(),
      expect(role('button', { name: 'Add a game to slot 4' })).toExist(),
      expect(role('button', { name: 'Share link' })).toBeDisabled(),
      expect(role('button', { name: 'Download PNG' })).toBeDisabled(),
      expect(role('combobox', { name: 'Poster subtitle' })).toHaveValue(
        'shaped',
      ),
    )
  })

  test('picking a game from search fills the slot', () => {
    scene(
      { update, view },
      given(init(Poster.empty())),
      click(role('button', { name: 'Add a game to slot 1' })),
      Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
      resolveDialogResources,
      type(label('Search for game #1'), 'ocarina'),
      Command.resolve(
        WaitBeforeSearch,
        Picker.Message.CompletedWaitBeforeSearch({ generation: 2 }),
      ),
      Command.resolve(
        SearchItems,
        Picker.Message.SucceededSearchItems({
          query: 'ocarina',
          results: [zeldaResult],
        }),
      ),
      click(role('button', { name: new RegExp(zelda.name) })),
      Command.resolve(
        Dialog.CloseDialog,
        Dialog.Message.CompletedCloseDialog(),
      ),
      Mount.expectEnded(Dialog.AcquireResources),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
      expect(role('button', { name: `Change ${zelda.name}` })).toExist(),
      expect(text('1 / 4 picked')).toExist(),
    )
  })

  test('removing a game frees its slot', () => {
    scene(
      { update, view },
      given(init(twoItemGrid)),
      click(role('button', { name: `Remove ${zelda.name}` })),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
      expect(role('button', { name: `Change ${zelda.name}` })).toBeAbsent(),
      expect(text('1 / 4 picked')).toExist(),
    )
  })

  test('Shift+arrow moves a game and announces the move', () => {
    scene(
      { update, view },
      given(init(twoItemGrid)),
      keydown(role('button', { name: `Change ${zelda.name}` }), 'ArrowRight', {
        shiftKey: true,
      }),
      expect(text(`Moved ${zelda.name} to position 2`)).toExist(),
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
      Command.resolve(FocusSlot, Message.CompletedFocusSlot()),
    )
  })

  test('an arrow key without Shift is left to the browser', () => {
    scene(
      { update, view },
      given(init(twoItemGrid)),
      keydown(role('button', { name: `Change ${zelda.name}` }), 'ArrowRight'),
      expectIgnored(),
    )
  })

  test('sharing shows the link once it is copied', () => {
    scene(
      { update, view },
      given(init(twoItemGrid)),
      click(role('button', { name: 'Share link' })),
      Command.resolve(
        ShareGrid,
        Message.SucceededShareGrid({ generation: 1, url: SHARE_URL }),
      ),
      Command.resolve(
        CopyShareUrl,
        Message.SucceededCopyShareUrl({ url: SHARE_URL }),
      ),
      expect(role('status')).toContainText('Link copied:'),
      expect(role('link', { name: SHARE_URL })).toExist(),
    )
  })

  test('a blocked clipboard shows the link without claiming it was copied', () => {
    scene(
      { update, view },
      given(init(twoItemGrid)),
      click(role('button', { name: 'Share link' })),
      Command.resolve(
        ShareGrid,
        Message.SucceededShareGrid({ generation: 1, url: SHARE_URL }),
      ),
      Command.resolve(
        CopyShareUrl,
        Message.FailedCopyShareUrl({ url: SHARE_URL }),
      ),
      expect(role('status')).toContainText('Share link:'),
      expect(role('status')).not.toContainText('copied'),
    )
  })

  test('a failed download is reported', () => {
    scene(
      { update, view },
      given(init(twoItemGrid)),
      click(role('button', { name: 'Download PNG' })),
      Command.resolve(
        DownloadPoster,
        PosterDownload.Message.FailedDownloadPoster({
          error: "Couldn't create the image.",
        }),
      ),
      expect(role('status')).toHaveText("Couldn't create the image."),
    )
  })

  test('the tile being dragged lets clicks and hit-testing pass through it', () => {
    scene(
      { update, view },
      given(
        modifyFields(init(twoItemGrid), {
          drag: () =>
            Drag.Dragging({
              slotIndex: 0,
              pointer: 'Mouse',
              originX: 0,
              originY: 0,
              currentX: 50,
              currentY: 20,
              maybeTargetIndex: Option.some(1),
            }),
        }),
      ),
      expect(selector('[data-slot-index="0"]')).toHaveClass(
        'pointer-events-none',
      ),
      expect(selector('[data-slot-index="1"]')).not.toHaveClass(
        'pointer-events-none',
      ),
    )
  })

  test('a failed share shows the error', () => {
    scene(
      { update, view },
      given(init(twoItemGrid)),
      click(role('button', { name: 'Share link' })),
      Command.resolve(
        ShareGrid,
        Message.FailedShareGrid({
          generation: 1,
          error: 'Sharing is busy right now. Try again later.',
        }),
      ),
      expect(role('status')).toHaveText(
        'Sharing is busy right now. Try again later.',
      ),
    )
  })
})
