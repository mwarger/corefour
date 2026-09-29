import { Array, Effect, Number, Option, Schema, Stream, pipe } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import { Drag, type Model } from './model'

/** Data attribute carrying a slot's index, used to find the slot under the pointer. */
export const SLOT_INDEX_ATTRIBUTE = 'slot-index'

// NOTE: the dragged tile has `pointer-events: none`, so hit-testing sees the
// slot beneath it and the browser's post-drop click never reaches the tile.
const slotIndexUnderPointer = (
  clientX: number,
  clientY: number,
): Option.Option<number> =>
  pipe(
    document.elementsFromPoint(clientX, clientY),
    Array.map(element =>
      Option.fromNullishOr(
        element.getAttribute(`data-${SLOT_INDEX_ATTRIBUTE}`),
      ),
    ),
    Array.getSomes,
    Array.head,
    Option.flatMap(Number.parse),
  )

const isPointerDown = (drag: Drag): boolean =>
  Drag.isAnyOf(['Pressing', 'Dragging'])(drag)

const isDraggingByTouch = (drag: Drag): boolean =>
  drag._tag === 'Dragging' && drag.pointer === 'Touch'

const pointerEvents: ReadonlyArray<Stream.Stream<Message>> = [
  Subscription.fromEvent({
    target: document,
    type: 'pointermove',
    mapEvent: ({ clientX, clientY }) =>
      Message.MovedPointer({
        clientX,
        clientY,
        maybeTargetIndex: slotIndexUnderPointer(clientX, clientY),
      }),
  }),
  Subscription.fromEvent({
    target: document,
    type: 'pointerup',
    mapEvent: () => Message.ReleasedPointer(),
  }),
  Subscription.fromEvent({
    target: document,
    type: 'pointercancel',
    mapEvent: () => Message.CancelledPointer(),
  }),
]

const pointerStream: Stream.Stream<Message> = Stream.mergeAll(pointerEvents, {
  concurrency: 'unbounded',
})

// NOTE: once a long press turns into a drag, cancelling touchmove stops the
// page from scrolling under the finger. It emits nothing; pointermove above
// carries the position.
const touchScrollLockStream: Stream.Stream<Message> =
  Subscription.fromEventFilterMap({
    target: document,
    type: 'touchmove',
    options: { passive: false },
    filterMapEvent: event => {
      event.preventDefault()
      return Option.none<Message>()
    },
  })

// NOTE: keeps the grabbing cursor and prevents text selection anywhere on the
// page while a tile is being dragged, the same way @foldkit/ui DragAndDrop does.
const dragDocumentStyles: Stream.Stream<Message> = Stream.callback(() =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const style = document.createElement('style')
      style.textContent =
        '* { cursor: grabbing !important; user-select: none !important; -webkit-user-select: none !important; }'
      document.head.appendChild(style)
      return style
    }),
    style => Effect.sync(() => style.remove()),
  ).pipe(Effect.flatMap(() => Effect.never)),
)

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  pointerTracking: entry(
    { isTracking: Schema.Boolean },
    {
      modelToDependencies: model => ({ isTracking: isPointerDown(model.drag) }),
      dependenciesToStream: ({ isTracking }) =>
        Stream.when(
          pointerStream,
          Effect.sync(() => isTracking),
        ),
    },
  ),

  touchScrollLock: entry(
    { isLocked: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isLocked: isDraggingByTouch(model.drag),
      }),
      dependenciesToStream: ({ isLocked }) =>
        Stream.when(
          touchScrollLockStream,
          Effect.sync(() => isLocked),
        ),
    },
  ),

  dragDocumentStyles: entry(
    { isDragging: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isDragging: model.drag._tag === 'Dragging',
      }),
      dependenciesToStream: ({ isDragging }) =>
        Stream.when(
          dragDocumentStyles,
          Effect.sync(() => isDragging),
        ),
    },
  ),
}))
