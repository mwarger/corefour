import clsx from 'clsx'
import { Array, Option, Record } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button, Select } from '@foldkit/ui'

import { CATEGORIES } from '../../../../shared/catalog'
import type { Item } from '../../../../shared/schema'
import * as Poster from '../../../domain/poster'
import {
  coverImageView,
  downloadIgnore,
  filledTileView,
  subtitleText,
} from '../../../view/poster'
import { slotButtonId } from '../command'
import { Message } from '../message'
import { Drag, type Model, type Pointer } from '../model'
import { SLOT_INDEX_ATTRIBUTE } from '../subscription'

const PRIMARY_MOUSE_BUTTON = 0

export const MOVE_HINT_ID = 'slot-move-hint'

const TARGET_RING_CLASS = 'ring-[0.9cqw] ring-amber-400 ring-offset-2'

const MOVE_KEYS: Readonly<globalThis.Record<string, Poster.MoveDirection>> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
}

type SlotDragState = Readonly<{
  isDragged: boolean
  isDropTarget: boolean
  maybeOffset: Option.Option<Readonly<{ x: number; y: number }>>
}>

const slotDragState = (drag: Drag, slotIndex: number): SlotDragState =>
  Drag.matchOrElse<SlotDragState>(
    drag,
    {
      Dragging: ({
        slotIndex: draggedIndex,
        originX,
        originY,
        currentX,
        currentY,
        maybeTargetIndex,
      }) => ({
        isDragged: draggedIndex === slotIndex,
        isDropTarget:
          draggedIndex !== slotIndex &&
          Option.contains(maybeTargetIndex, slotIndex),
        maybeOffset: Option.liftPredicate(
          { x: currentX - originX, y: currentY - originY },
          () => draggedIndex === slotIndex,
        ),
      }),
    },
    () => ({
      isDragged: false,
      isDropTarget: false,
      maybeOffset: Option.none(),
    }),
  )

const toPointer = (pointerType: string): Pointer =>
  pointerType === 'touch' ? 'Touch' : 'Mouse'

const toMaybeMoveMessage =
  (slotIndex: number) =>
  (
    key: string,
    { shiftKey }: Readonly<{ shiftKey: boolean }>,
  ): Option.Option<Message> =>
    Record.get(MOVE_KEYS, key).pipe(
      Option.filter(() => shiftKey),
      Option.map(direction => Message.PressedMoveKey({ slotIndex, direction })),
    )

export const subtitlePickerView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  Select.view(
    {
      id: 'poster-subtitle',
      value: model.grid.subtitle,
      onChange: subtitleId => Message.SelectedSubtitle({ subtitleId }),
      toView: attributes =>
        h.div(
          [
            h.Class(
              'relative mx-auto flex w-fit max-w-full items-center gap-[0.8cqw] rounded-[1cqw] px-[1cqw] text-[2.4cqw] font-semibold text-ink/70 hover:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber-400',
            ),
          ],
          [
            h.span([h.Class('truncate')], [subtitleText(model.grid)]),
            h.span(
              [
                downloadIgnore(h),
                h.AriaHidden(true),
                h.Class('text-[2cqw] opacity-60'),
              ],
              ['▾'],
            ),
            h.select(
              [
                ...attributes.select,
                downloadIgnore(h),
                h.AriaLabel('Poster subtitle'),
                h.Class('absolute inset-0 cursor-pointer opacity-0'),
              ],
              Array.map(
                CATEGORIES[model.grid.category].subtitles,
                ({ id, text }) => h.keyed('option')(id, [h.Value(id)], [text]),
              ),
            ),
          ],
        ),
    },
    h,
  )

const pickButtonView = (
  item: Item,
  slotIndex: number,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick: Message.ClickedSlot({ slotIndex }),
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Id(slotButtonId(slotIndex)),
            h.AriaLabel(`Change ${item.name}`),
            h.AriaDescribedBy(MOVE_HINT_ID),
            h.OnKeyDownPreventDefault(toMaybeMoveMessage(slotIndex)),
            // NOTE: an outline (not an inset ring) so the focus indicator paints
            // above the full-size cover image.
            h.Class(
              'block size-full cursor-[inherit] outline-none focus-visible:outline-solid focus-visible:outline-[0.8cqw] focus-visible:-outline-offset-[0.8cqw] focus-visible:outline-amber-400',
            ),
          ],
          [coverImageView(item, h)],
        ),
    },
    h,
  )

const removeButtonView = (
  item: Item,
  slotIndex: number,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick: Message.ClickedRemoveItem({ slotIndex }),
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            downloadIgnore(h),
            h.AriaLabel(`Remove ${item.name}`),
            h.Class(
              'absolute top-[1.5cqw] right-[1.5cqw] flex size-[5.5cqw] cursor-pointer items-center justify-center rounded-full bg-black/60 text-[3.2cqw] text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100',
            ),
          ],
          ['×'],
        ),
    },
    h,
  )

// NOTE: drag-to-swap is hand-rolled rather than @foldkit/ui DragAndDrop:
// that component reorders by insertion along one axis and activates on a
// distance threshold only, while this poster swaps slots in a 2×2 grid and
// needs a touch long-press so the page still scrolls. Keyboard users get
// Shift+arrow moves instead of DragAndDrop's keyboard mode.
const filledSlotView = (
  item: Item,
  slotIndex: number,
  { isDragged, isDropTarget, maybeOffset }: SlotDragState,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.DataAttribute(SLOT_INDEX_ATTRIBUTE, `${slotIndex}`),
      h.OnPointerDown(
        (
          pointerType,
          button,
          _screenX,
          _screenY,
          _timeStamp,
          clientX,
          clientY,
        ) =>
          Option.liftPredicate(
            Message.PressedSlot({
              slotIndex,
              pointer: toPointer(pointerType),
              clientX,
              clientY,
            }),
            () => button === PRIMARY_MOUSE_BUTTON,
          ),
      ),
      h.Style(
        Option.match(maybeOffset, {
          onNone: () => ({}),
          onSome: ({ x, y }) => ({
            transform: `translate3d(${x}px, ${y}px, 0) rotate(2deg) scale(1.05)`,
          }),
        }),
      ),
      h.Class(
        clsx(
          'group relative touch-manipulation rounded-[2.6cqw] select-none [-webkit-touch-callout:none]',
          {
            'pointer-events-none z-10 shadow-2xl': isDragged,
            'cursor-grab': !isDragged,
            [TARGET_RING_CLASS]: isDropTarget,
          },
        ),
      ),
    ],
    [
      filledTileView(item, pickButtonView(item, slotIndex, h), h),
      removeButtonView(item, slotIndex, h),
    ],
  )

const emptySlotView = (
  noun: string,
  slotIndex: number,
  { isDropTarget }: SlotDragState,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick: Message.ClickedSlot({ slotIndex }),
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Id(slotButtonId(slotIndex)),
            h.AriaLabel(`Add a ${noun} to slot ${slotIndex + 1}`),
            h.DataAttribute(SLOT_INDEX_ATTRIBUTE, `${slotIndex}`),
            h.Class(
              clsx(
                'flex aspect-[5/7] cursor-pointer flex-col items-center justify-center gap-[1.5cqw] rounded-[2.6cqw] border-[0.5cqw] border-dashed border-ink/25 bg-white/40 text-ink/50 transition hover:border-ink/50 hover:bg-white/60 hover:text-ink/80',
                { [TARGET_RING_CLASS]: isDropTarget },
              ),
            ),
          ],
          [
            h.span(
              [
                h.AriaHidden(true),
                h.Class('text-[9cqw] leading-none font-light'),
              ],
              ['+'],
            ),
            h.span([h.Class('text-[2.6cqw] font-semibold')], [`Add a ${noun}`]),
          ],
        ),
    },
    h,
  )

export const slotView = (
  model: Model,
  maybeItem: Option.Option<Item>,
  slotIndex: number,
  h: HtmlBuilder<Message>,
): Html => {
  const dragState = slotDragState(model.drag, slotIndex)
  return Option.match(maybeItem, {
    onNone: () =>
      emptySlotView(
        CATEGORIES[model.grid.category].noun,
        slotIndex,
        dragState,
        h,
      ),
    onSome: item => filledSlotView(item, slotIndex, dragState, h),
  })
}
