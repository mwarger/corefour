import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { MoveDirection } from '../../domain/poster'
import * as PosterDownload from '../../posterDownload'
import { Pointer } from './model'
import * as Picker from './picker'

export const Message = defineMessageUnion({
  SelectedSubtitle: { subtitleId: Schema.String },
  ClickedSlot: { slotIndex: Schema.Number },
  ClickedRemoveItem: { slotIndex: Schema.Number },
  ClickedStartOver: {},
  ClickedShareLink: {},
  SucceededShareGrid: { generation: Schema.Number, url: Schema.String },
  FailedShareGrid: { generation: Schema.Number, error: Schema.String },
  SucceededCopyShareUrl: { url: Schema.String },
  FailedCopyShareUrl: { url: Schema.String },
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
  CompletedWaitForLongPress: { generation: Schema.Number },
  PressedMoveKey: { slotIndex: Schema.Number, direction: MoveDirection },
  CompletedFocusSlot: {},
  GotPickerMessage: { message: Picker.Message },
  GotPosterDownloadMessage: { message: PosterDownload.Message },
})
export type Message = typeof Message.Type
