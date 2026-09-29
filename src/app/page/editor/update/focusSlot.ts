import type { Update } from 'foldkit'

import { FocusSlot } from '../command'
import type { Message } from '../message'
import type { Model } from '../model'

// NOTE: picking, removing and moving swap a slot between its empty and filled
// views, which replaces the focused element; this puts focus back on the slot.
export const focusSlot =
  (slotIndex: number): Update.Step<Model, Message> =>
  model => ({ model, commands: [FocusSlot({ slotIndex })] })
