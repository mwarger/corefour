import { Match, Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import * as Poster from '../../../domain/poster'
import { WaitForLongPress } from '../command'
import type { Message } from '../message'
import { Drag, type Model, type Pointer } from '../model'
import { editGrid } from './editGrid'
import type { UpdateReturn } from './update'

const MOUSE_DRAG_THRESHOLD_PX = 6
const TOUCH_SCROLL_TOLERANCE_PX = 8

const distance = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number => Math.hypot(toX - fromX, toY - fromY)

const setDrag =
  (drag: Drag): Update.Step<Model, Message> =>
  model => ({ model: modifyFields(model, { drag: () => drag }) })

const startDragging = (
  pressing: typeof Drag.Pressing.Type,
  currentX: number,
  currentY: number,
  maybeTargetIndex: Option.Option<number>,
): Drag =>
  Drag.Dragging({
    slotIndex: pressing.slotIndex,
    pointer: pressing.pointer,
    originX: pressing.originX,
    originY: pressing.originY,
    currentX,
    currentY,
    maybeTargetIndex,
  })

export const handlePressedSlot =
  (model: Model) =>
  ({
    slotIndex,
    pointer,
    clientX,
    clientY,
  }: {
    slotIndex: number
    pointer: Pointer
    clientX: number
    clientY: number
  }): UpdateReturn => {
    if (
      model.drag._tag !== 'Idle' ||
      Option.isNone(Poster.itemAt(model.grid, slotIndex))
    ) {
      return { model }
    }

    const generation = model.pressGeneration + 1
    const nextModel = modifyFields(model, {
      pressGeneration: () => generation,
      drag: () =>
        Drag.Pressing({
          slotIndex,
          pointer,
          generation,
          originX: clientX,
          originY: clientY,
        }),
    })

    return pointer === 'Touch'
      ? { model: nextModel, commands: [WaitForLongPress({ generation })] }
      : { model: nextModel }
  }

export const handleMovedPointer =
  (model: Model) =>
  ({
    clientX,
    clientY,
    maybeTargetIndex,
  }: {
    clientX: number
    clientY: number
    maybeTargetIndex: Option.Option<number>
  }): UpdateReturn =>
    Drag.match<UpdateReturn>(model.drag, {
      Idle: () => ({ model }),

      Pressing: pressing => {
        const moved = distance(
          pressing.originX,
          pressing.originY,
          clientX,
          clientY,
        )
        return Match.value(pressing.pointer).pipe(
          Match.withReturnType<UpdateReturn>(),
          Match.when('Mouse', () =>
            moved > MOUSE_DRAG_THRESHOLD_PX
              ? setDrag(
                  startDragging(pressing, clientX, clientY, maybeTargetIndex),
                )(model)
              : { model },
          ),
          Match.when('Touch', () =>
            moved > TOUCH_SCROLL_TOLERANCE_PX
              ? setDrag(Drag.Idle())(model)
              : { model },
          ),
          Match.exhaustive,
        )
      },

      Dragging: dragging =>
        setDrag(
          modifyFields(dragging, {
            currentX: () => clientX,
            currentY: () => clientY,
            maybeTargetIndex: () => maybeTargetIndex,
          }),
        )(model),
    })

export const handleReleasedPointer = (model: Model): UpdateReturn =>
  Drag.matchOrElse<UpdateReturn>(
    model.drag,
    {
      Dragging: ({ slotIndex, maybeTargetIndex }) =>
        Option.match(
          Option.filter(
            maybeTargetIndex,
            targetIndex => targetIndex !== slotIndex,
          ),
          {
            onNone: () => setDrag(Drag.Idle())(model),
            onSome: targetIndex =>
              Update.combine(model, [
                setDrag(Drag.Idle()),
                editGrid(Poster.swapItems(slotIndex, targetIndex)),
              ]),
          },
        ),
    },
    () => setDrag(Drag.Idle())(model),
  )

export const handleCompletedWaitForLongPress =
  (model: Model) =>
  ({ generation }: { generation: number }): UpdateReturn =>
    Drag.matchOrElse<UpdateReturn>(
      model.drag,
      {
        Pressing: pressing =>
          pressing.pointer === 'Touch' && pressing.generation === generation
            ? setDrag(
                startDragging(
                  pressing,
                  pressing.originX,
                  pressing.originY,
                  Option.none(),
                ),
              )(model)
            : { model },
      },
      () => ({ model }),
    )

export const handleCancelledPointer = (model: Model): UpdateReturn =>
  setDrag(Drag.Idle())(model)
