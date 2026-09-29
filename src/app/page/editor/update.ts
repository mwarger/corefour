import { Array, Match, Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { type Grid, itemFromSearchResult } from '../../../shared/schema'
import * as GridDomain from '../../domain/grid'
import {
  CopyShareUrl,
  ExportPoster,
  FocusSlot,
  SaveDraft,
  ShareGrid,
  WaitForLongPress,
} from './command'
import { Message } from './message'
import { Drag, ExportState, Model, type Pointer, ShareState } from './model'
import * as Picker from './picker'

const MOUSE_DRAG_THRESHOLD_PX = 6
const TOUCH_SCROLL_TOLERANCE_PX = 8

type UpdateReturn = Update.Return<Model, Message>

/** Replaces the poster, saves the draft, and drops any stale share link. */
export const replaceGrid = (model: Model, grid: Grid): UpdateReturn => ({
  model: modifyFields(model, {
    grid: () => grid,
    share: () => ShareState.Idle(),
  }),
  commands: [SaveDraft({ grid })],
})

const foldPickerOutMessage = Picker.OutMessage.match<
  Update.Step<Model, Message>
>({
  SelectedResult:
    ({ slotIndex, result }) =>
    model =>
      replaceGrid(
        model,
        GridDomain.setItem(
          slotIndex,
          Option.some(itemFromSearchResult(result)),
        )(model.grid),
      ),
})

const foldPicker = Update.foldChild({
  update: Picker.update,
  read: (model: Model) => Option.some(model.picker),
  write: (model, nextPicker) =>
    modifyFields(model, { picker: () => nextPicker }),
  toParentMessage: message => Message.GotPickerMessage({ message }),
  foldOutMessage: foldPickerOutMessage,
})

const openPicker = (target: Picker.OpenTarget) =>
  Update.foldChildStep({
    update: Picker.open(target),
    read: (model: Model) => Option.some(model.picker),
    write: (model, nextPicker) =>
      modifyFields(model, { picker: () => nextPicker }),
    toParentMessage: message => Message.GotPickerMessage({ message }),
  })

const distance = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number => Math.hypot(toX - fromX, toY - fromY)

const startDragging = (
  pressing: typeof Drag.Pressing.Type,
  currentX: number,
  currentY: number,
): Drag =>
  Drag.Dragging({
    slotIndex: pressing.slotIndex,
    pointer: pressing.pointer,
    originX: pressing.originX,
    originY: pressing.originY,
    currentX,
    currentY,
    maybeTargetIndex: Option.none(),
  })

const withDrag = (model: Model, drag: Drag): UpdateReturn => ({
  model: modifyFields(model, { drag: () => drag }),
})

const handlePressedSlot = (
  model: Model,
  slotIndex: number,
  pointer: Pointer,
  clientX: number,
  clientY: number,
): UpdateReturn => {
  if (
    Drag.isAnyOf(['Pressing', 'Dragging'])(model.drag) ||
    Option.isNone(GridDomain.itemAt(model.grid, slotIndex))
  ) {
    return { model }
  }

  const pressId = model.pressCount + 1
  const nextModel = modifyFields(model, {
    pressCount: () => pressId,
    drag: () =>
      Drag.Pressing({
        slotIndex,
        pointer,
        pressId,
        originX: clientX,
        originY: clientY,
      }),
  })

  return pointer === 'Touch'
    ? { model: nextModel, commands: [WaitForLongPress({ pressId })] }
    : { model: nextModel }
}

const handleMovedPointer = (
  model: Model,
  clientX: number,
  clientY: number,
  maybeTargetIndex: Option.Option<number>,
): UpdateReturn =>
  Drag.match<UpdateReturn>(model.drag, {
    Idle: () => ({ model }),
    JustDropped: () => ({ model }),

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
            ? withDrag(model, startDragging(pressing, clientX, clientY))
            : { model },
        ),
        Match.when('Touch', () =>
          moved > TOUCH_SCROLL_TOLERANCE_PX
            ? withDrag(model, Drag.Idle())
            : { model },
        ),
        Match.exhaustive,
      )
    },

    Dragging: dragging =>
      withDrag(
        model,
        modifyFields(dragging, {
          currentX: () => clientX,
          currentY: () => clientY,
          maybeTargetIndex: () => maybeTargetIndex,
        }),
      ),
  })

const handleReleasedPointer = (model: Model): UpdateReturn =>
  Drag.matchOrElse<UpdateReturn>(
    model.drag,
    {
      Dragging: ({ slotIndex, maybeTargetIndex }) => {
        const droppedModel = modifyFields(model, {
          drag: () => Drag.JustDropped(),
        })
        return Option.match(maybeTargetIndex, {
          onNone: () => ({ model: droppedModel }),
          onSome: targetIndex =>
            replaceGrid(
              droppedModel,
              GridDomain.swapItems(slotIndex, targetIndex)(model.grid),
            ),
        })
      },
    },
    () => withDrag(model, Drag.Idle()),
  )

const handleCompletedWaitForLongPress = (
  model: Model,
  pressId: number,
): UpdateReturn =>
  Drag.matchOrElse<UpdateReturn>(
    model.drag,
    {
      Pressing: pressing =>
        pressing.pointer === 'Touch' && pressing.pressId === pressId
          ? withDrag(
              model,
              startDragging(pressing, pressing.originX, pressing.originY),
            )
          : { model },
    },
    () => ({ model }),
  )

const handlePressedMoveKey = (
  model: Model,
  slotIndex: number,
  direction: GridDomain.MoveDirection,
): UpdateReturn =>
  Option.match(GridDomain.neighborIndex(slotIndex, direction), {
    onNone: () => ({ model }),
    onSome: targetIndex => {
      const gridReplace = replaceGrid(
        model,
        GridDomain.swapItems(slotIndex, targetIndex)(model.grid),
      )
      const announcement = Option.map(
        GridDomain.itemAt(model.grid, slotIndex),
        ({ name }) => `Moved ${name} to position ${targetIndex + 1}`,
      )
      return {
        model: modifyFields(gridReplace.model, {
          maybeAnnouncement: () => announcement,
        }),
        commands: Array.append(
          gridReplace.commands ?? [],
          FocusSlot({ slotIndex: targetIndex }),
        ),
      }
    },
  })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    SelectedSubtitle: ({ subtitleId }) =>
      replaceGrid(model, GridDomain.setSubtitle(subtitleId)(model.grid)),

    ClickedSlot: ({ slotIndex }) =>
      model.drag._tag === 'JustDropped'
        ? withDrag(model, Drag.Idle())
        : openPicker({ slotIndex, category: model.grid.category })(model),

    ClickedRemoveItem: ({ slotIndex }) =>
      replaceGrid(
        model,
        GridDomain.setItem(slotIndex, Option.none())(model.grid),
      ),

    ClickedStartOver: () => replaceGrid(model, GridDomain.empty()),

    ClickedDownloadPng: () =>
      model.imageExport._tag === 'Exporting'
        ? { model }
        : {
            model: modifyFields(model, {
              imageExport: () => ExportState.Exporting(),
            }),
            commands: [
              ExportPoster({ filename: GridDomain.posterFilename(model.grid) }),
            ],
          },

    SucceededExportPoster: () => ({
      model: modifyFields(model, { imageExport: () => ExportState.Idle() }),
    }),

    FailedExportPoster: ({ error }) => ({
      model: modifyFields(model, {
        imageExport: () => ExportState.Failed({ error }),
      }),
    }),

    ClickedShareLink: () =>
      model.share._tag === 'Sharing' || GridDomain.isEmpty(model.grid)
        ? { model }
        : {
            model: modifyFields(model, { share: () => ShareState.Sharing() }),
            commands: [ShareGrid({ grid: model.grid })],
          },

    SucceededShareGrid: ({ url }) => ({
      model: modifyFields(model, { share: () => ShareState.Shared({ url }) }),
      commands: [CopyShareUrl({ url })],
    }),

    FailedShareGrid: ({ error }) => ({
      model: modifyFields(model, { share: () => ShareState.Failed({ error }) }),
    }),

    CompletedCopyShareUrl: () => ({ model }),
    CompletedSaveDraft: () => ({ model }),
    CompletedFocusSlot: () => ({ model }),

    PressedSlot: ({ slotIndex, pointer, clientX, clientY }) =>
      handlePressedSlot(model, slotIndex, pointer, clientX, clientY),

    MovedPointer: ({ clientX, clientY, maybeTargetIndex }) =>
      handleMovedPointer(model, clientX, clientY, maybeTargetIndex),

    ReleasedPointer: () => handleReleasedPointer(model),

    CancelledPointer: () => withDrag(model, Drag.Idle()),

    CompletedWaitForLongPress: ({ pressId }) =>
      handleCompletedWaitForLongPress(model, pressId),

    PressedMoveKey: ({ slotIndex, direction }) =>
      handlePressedMoveKey(model, slotIndex, direction),

    GotPickerMessage: ({ message }) => foldPicker(model, message),
  })
