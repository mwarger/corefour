/** Data attribute carrying a slot's index, used to find the slot under the pointer. */
export const SLOT_INDEX_ATTRIBUTE = 'slot-index'

/** Describes the Shift+arrow move shortcut for each tile's pick button. */
export const MOVE_HINT_ID = 'slot-move-hint'

export const slotButtonId = (slotIndex: number): string =>
  `slot-button-${slotIndex}`
