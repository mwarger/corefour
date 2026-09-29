import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { MoveDirection } from '../../domain/grid'
import { Pointer } from './model'
import * as Picker from './picker'

export const Message = defineMessageUnion({
  SelectedSubtitle: { subtitleId: Schema.String },
  ClickedSlot: { slotIndex: Schema.Number },
  ClickedRemoveItem: { slotIndex: Schema.Number },
  ClickedStartOver: {},
  ClickedDownloadPng: {},
  SucceededExportPoster: {},
  FailedExportPoster: { error: Schema.String },
  ClickedShareLink: {},
  SucceededShareGrid: { url: Schema.String },
  FailedShareGrid: { error: Schema.String },
  CompletedCopyShareUrl: {},
  CompletedSaveDraft: {},
  PressedSlot: {
    slotIndex: Schema.Number,
    pointer: Pointer,
    clientX: Schema.Number,
    clientY: Schema.Number,
  },
  MovedPointer: {
    clientX: Schema.Number,
    clientY: Schema.Number,
    maybeTargetIndex: Schema.Option(Schema.Number),
  },
  ReleasedPointer: {},
  CancelledPointer: {},
  CompletedWaitForLongPress: { pressId: Schema.Number },
  PressedMoveKey: { slotIndex: Schema.Number, direction: MoveDirection },
  CompletedFocusSlot: {},
  GotPickerMessage: { message: Picker.Message },
})
export type Message = typeof Message.Type
