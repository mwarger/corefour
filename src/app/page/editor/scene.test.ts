import {
  Command,
  Mount,
  click,
  expect,
  given,
  inside,
  keydown,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Dialog } from '@foldkit/ui'

import * as GridDomain from '../../domain/grid'
import { twoItemGrid, zelda, zeldaResult } from '../../fixture'
import { CopyShareUrl, FocusSlot, SaveDraft, ShareGrid } from './command'
import { Message } from './message'
import { init } from './model'
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
      given(init(GridDomain.empty())),
      expect(role('heading', { name: 'My Core Four' })).toExist(),
      expect(text('0 / 4 picked')).toExist(),
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
      given(init(GridDomain.empty())),
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
      expect(text('1998 · N64, Wii, 3DS, WiiU +2')).toExist(),
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
      Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
      Command.resolve(FocusSlot, Message.CompletedFocusSlot()),
      expect(text(`Moved ${zelda.name} to position 2`)).toExist(),
    )
  })

  test('sharing shows the copied link', () => {
    scene(
      { update, view },
      given(init(twoItemGrid)),
      click(role('button', { name: 'Share link' })),
      Command.resolve(
        ShareGrid,
        Message.SucceededShareGrid({ url: SHARE_URL }),
      ),
      Command.resolve(CopyShareUrl, Message.CompletedCopyShareUrl()),
      inside(
        role('status'),
        expect(text('Link copied:', { exact: false })).toExist(),
        expect(role('link', { name: SHARE_URL })).toExist(),
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
          error: 'Sharing is busy right now. Try again later.',
        }),
      ),
      expect(text('Sharing is busy right now. Try again later.')).toExist(),
    )
  })
})
