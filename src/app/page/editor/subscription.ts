import { Array, Effect, Option, Schema, Stream, pipe } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import { Drag, type Model } from './model'

/** Data attribute carrying a slot's index, used to find the slot under the pointer. */
export const SLOT_INDEX_ATTRIBUTE = 'slot-index'

// NOTE: the dragged tile follows the pointer, so it is the topmost element
// under it. Hit-testing skips it and reports the slot beneath.
const slotIndexUnderPointer = (
  clientX: number,
  clientY: number,
  draggedIndex: number,
): Option.Option<number> =>
  pipe(
    document.elementsFromPoint(clientX, clientY),
    Array.fromIterable,
    Array.map(element =>
      Option.fromNullishOr(
        element.getAttribute(`data-${SLOT_INDEX_ATTRIBUTE}`),
      ),
    ),
    Array.getSomes,
    Array.map(globalThis.Number),
    Array.findFirst(index => index !== draggedIndex),
  )

const activeSlotIndex = (drag: Drag): Option.Option<number> =>
  Drag.match(drag, {
    Idle: () => Option.none(),
    Pressing: ({ slotIndex }) => Option.some(slotIndex),
    Dragging: ({ slotIndex }) => Option.some(slotIndex),
    JustDropped: () => Option.none(),
  })

const isTouchDragging = (drag: Drag): boolean =>
  drag._tag === 'Dragging' && drag.pointer === 'Touch'

const pointerStream = (draggedIndex: number): Stream.Stream<Message> =>
  Stream.merge(
    Stream.merge(
      Subscription.fromEvent({
        target: document,
        type: 'pointermove',
        mapEvent: ({ clientX, clientY }) =>
          Message.MovedPointer({
            clientX,
            clientY,
            maybeTargetIndex: slotIndexUnderPointer(
              clientX,
              clientY,
              draggedIndex,
            ),
          }),
      }),
      Subscription.fromEvent({
        target: document,
        type: 'pointerup',
        mapEvent: () => Message.ReleasedPointer(),
      }),
    ),
    Subscription.fromEvent({
      target: document,
      type: 'pointercancel',
      mapEvent: () => Message.CancelledPointer(),
    }),
  )

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
// page while a tile is being dragged.
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
    { maybeDraggedIndex: Schema.Option(Schema.Number) },
    {
      modelToDependencies: model => ({
        maybeDraggedIndex: activeSlotIndex(model.drag),
      }),
      dependenciesToStream: ({ maybeDraggedIndex }) =>
        Option.match(maybeDraggedIndex, {
          onNone: () => Stream.empty,
          onSome: pointerStream,
        }),
    },
  ),

  touchScrollLock: entry(
    { isTouchDragging: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isTouchDragging: isTouchDragging(model.drag),
      }),
      dependenciesToStream: ({ isTouchDragging }) =>
        Stream.when(
          touchScrollLockStream,
          Effect.sync(() => isTouchDragging),
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
