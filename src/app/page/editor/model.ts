import { Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Grid } from '../../../shared/schema'
import * as PosterDownload from '../../posterDownload'
import * as Picker from './picker'

export const Pointer = Schema.Literals(['Mouse', 'Touch'])
export type Pointer = typeof Pointer.Type

/**
 * A pointer on a filled slot. `Pressing` has not moved far enough (mouse) or
 * been held long enough (touch) to count as a drag yet.
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
})
export type Drag = typeof Drag.Type

export const Clipboard = Schema.Literals(['Copying', 'Copied', 'NotCopied'])

/** `generation` ties a share's result to the request that produced it. */
export const ShareState = defineTaggedUnion({
  Idle: {},
  Sharing: { generation: Schema.Number },
  Shared: { url: Schema.String, clipboard: Clipboard },
  Failed: { error: Schema.String },
})

export const Model = Schema.Struct({
  grid: Grid,
  picker: Picker.Model,
  drag: Drag,
  pressCount: Schema.Number,
  share: ShareState,
  shareCount: Schema.Number,
  posterDownload: PosterDownload.Model,
  maybeAnnouncement: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type

export const init = (grid: Grid): Model => ({
  grid,
  picker: Picker.init(),
  drag: Drag.Idle(),
  pressCount: 0,
  share: ShareState.Idle(),
  shareCount: 0,
  posterDownload: PosterDownload.init(),
  maybeAnnouncement: Option.none(),
})
