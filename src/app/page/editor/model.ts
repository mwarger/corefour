import { Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Grid } from '../../../shared/schema'
import * as Picker from './picker'

export const Pointer = Schema.Literals(['Mouse', 'Touch'])
export type Pointer = typeof Pointer.Type

/**
 * A pointer on a filled slot. `Pressing` has not moved far enough (mouse) or
 * been held long enough (touch) to count as a drag yet. `JustDropped` swallows
 * the click the browser fires when a drag is released over its own tile.
 */
export const Drag = defineTaggedUnion({
  Idle: {},
  Pressing: {
    slotIndex: Schema.Number,
    pointer: Pointer,
    pressId: Schema.Number,
    originX: Schema.Number,
    originY: Schema.Number,
  },
  Dragging: {
    slotIndex: Schema.Number,
    pointer: Pointer,
    originX: Schema.Number,
    originY: Schema.Number,
    currentX: Schema.Number,
    currentY: Schema.Number,
    maybeTargetIndex: Schema.Option(Schema.Number),
  },
  JustDropped: {},
})
export type Drag = typeof Drag.Type

export const ShareState = defineTaggedUnion({
  Idle: {},
  Sharing: {},
  Shared: { url: Schema.String },
  Failed: { error: Schema.String },
})
export type ShareState = typeof ShareState.Type

export const ExportState = defineTaggedUnion({
  Idle: {},
  Exporting: {},
  Failed: { error: Schema.String },
})
export type ExportState = typeof ExportState.Type

export const Model = Schema.Struct({
  grid: Grid,
  picker: Picker.Model,
  drag: Drag,
  pressCount: Schema.Number,
  share: ShareState,
  imageExport: ExportState,
  maybeAnnouncement: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type

export const init = (grid: Grid): Model => ({
  grid,
  picker: Picker.init(),
  drag: Drag.Idle(),
  pressCount: 0,
  share: ShareState.Idle(),
  imageExport: ExportState.Idle(),
  maybeAnnouncement: Option.none(),
})
