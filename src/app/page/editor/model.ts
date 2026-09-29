import { Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Grid } from '../../../shared/schema'
import * as PosterDownload from '../../posterDownload'
import * as Picker from './picker'

export const Pointer = Schema.Literals(['Mouse', 'Touch'])
export type Pointer = typeof Pointer.Type

/**
 * A pointer on a filled slot. `Pressing` has not moved far enough (mouse) or
 * been held long enough (touch) to count as a drag yet; its `generation`
 * ties the long-press timer to the press that started it.
 */
export const Drag = defineTaggedUnion({
  Idle: {},
  Pressing: {
    slotIndex: Schema.Number,
    pointer: Pointer,
    generation: Schema.Number,
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
export type Clipboard = typeof Clipboard.Type

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
  pressGeneration: Schema.Number,
  share: ShareState,
  shareGeneration: Schema.Number,
  posterDownload: PosterDownload.Model,
  maybeAnnouncement: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type

export const init = (grid: Grid): Model => ({
  grid,
  picker: Picker.init(),
  drag: Drag.Idle(),
  pressGeneration: 0,
  share: ShareState.Idle(),
  shareGeneration: 0,
  posterDownload: PosterDownload.init(),
  maybeAnnouncement: Option.none(),
})
