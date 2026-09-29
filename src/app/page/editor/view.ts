import clsx from 'clsx'
import { Array, Match, Option } from 'effect'
import { Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button, Select } from '@foldkit/ui'

import { CATEGORIES } from '../../../shared/catalog'
import { GRID_SIZE, type Item } from '../../../shared/schema'
import * as GridDomain from '../../domain/grid'
import {
  actionButtonView,
  errorNoticeView,
  pageView,
  posterFrameView,
} from '../../view/layout'
import {
  coverImageView,
  exportIgnore,
  filledTileView,
  posterView,
  subtitleText,
} from '../../view/poster'
import { slotButtonId } from './command'
import { Message } from './message'
import { Drag, Model, type Pointer } from './model'
import * as Picker from './picker'
import { SLOT_INDEX_ATTRIBUTE } from './subscription'

const PRIMARY_MOUSE_BUTTON = 0

const TARGET_RING_CLASS = 'ring-[0.9cqw] ring-amber-400 ring-offset-2'

const MOVE_KEYS: Readonly<Record<string, GridDomain.MoveDirection>> = {
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
        isDropTarget: Option.contains(maybeTargetIndex, slotIndex),
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
    shiftKey
      ? Option.map(Option.fromNullishOr(MOVE_KEYS[key]), direction =>
          Message.PressedMoveKey({ slotIndex, direction }),
        )
      : Option.none()

// VIEW

const subtitlePickerView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Select.view(
    {
      id: 'poster-subtitle',
      value: model.grid.subtitle,
      onChange: subtitleId => Message.SelectedSubtitle({ subtitleId }),
      toView: attributes =>
        h.div(
          [
            h.Class(
              'relative mx-auto flex w-fit max-w-full items-center gap-[0.8cqw] text-[2.4cqw] font-semibold text-ink/70 hover:text-ink',
            ),
          ],
          [
            h.span([h.Class('truncate')], [subtitleText(model.grid)]),
            h.span(
              [
                exportIgnore(h),
                h.AriaHidden(true),
                h.Class('text-[2cqw] opacity-60'),
              ],
              ['▾'],
            ),
            h.select(
              [
                ...attributes.select,
                exportIgnore(h),
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
            h.AriaDescription('Shift and arrow keys move it'),
            h.OnKeyDownPreventDefault(toMaybeMoveMessage(slotIndex)),
            h.Class('block size-full cursor-[inherit]'),
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
            exportIgnore(h),
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

const filledSlotView = (
  item: Item,
  slotIndex: number,
  { isDragged, isDropTarget, maybeOffset }: SlotDragState,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.DataAttribute(SLOT_INDEX_ATTRIBUTE, globalThis.String(slotIndex)),
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
            'z-10 cursor-grabbing shadow-2xl': isDragged,
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
            h.DataAttribute(SLOT_INDEX_ATTRIBUTE, globalThis.String(slotIndex)),
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

const slotView = (
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

const noticeView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Option.Option<Html> =>
  Match.value(model).pipe(
    Match.withReturnType<Option.Option<Html>>(),
    Match.when({ share: { _tag: 'Shared' } }, ({ share: { url } }) =>
      Option.some(
        h.span(
          [],
          [
            'Link copied: ',
            h.a(
              [h.Href(url), h.Class('font-semibold break-all underline')],
              [url],
            ),
          ],
        ),
      ),
    ),
    Match.when({ share: { _tag: 'Failed' } }, ({ share: { error } }) =>
      Option.some(errorNoticeView(error, h)),
    ),
    Match.when(
      { imageExport: { _tag: 'Failed' } },
      ({ imageExport: { error } }) => Option.some(errorNoticeView(error, h)),
    ),
    Match.orElse(() => Option.none()),
  )

const toolbarView = (
  model: Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  const filledCount = GridDomain.filledCount(model.grid)
  const isEmpty = filledCount === 0
  return [
    h.span(
      [h.Class('mr-auto font-semibold')],
      [`${filledCount} / ${GRID_SIZE} picked`],
    ),
    actionButtonView(
      {
        label: 'Start over',
        onClick: Message.ClickedStartOver(),
        isPrimary: false,
        isBusy: false,
        isDisabled: false,
      },
      h,
    ),
    actionButtonView(
      {
        label: 'Download PNG',
        onClick: Message.ClickedDownloadPng(),
        isPrimary: false,
        isBusy: model.imageExport._tag === 'Exporting',
        isDisabled: isEmpty,
      },
      h,
    ),
    actionButtonView(
      {
        label: 'Share link',
        onClick: Message.ClickedShareLink(),
        isPrimary: true,
        isBusy: model.share._tag === 'Sharing',
        isDisabled: isEmpty,
      },
      h,
    ),
  ]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
  pageView(
    {
      toolbar: toolbarView(model, h),
      maybeNotice: noticeView(model, h),
      content: h.div(
        [h.Class('w-full')],
        [
          posterFrameView(
            posterView(
              {
                grid: model.grid,
                subtitle: subtitlePickerView(model, h),
                slots: Array.map(model.grid.items, (maybeItem, slotIndex) =>
                  slotView(model, maybeItem, slotIndex, h),
                ),
              },
              h,
            ),
            h,
          ),
          h.div(
            [h.AriaLive('polite'), h.Class('sr-only')],
            [Option.getOrElse(model.maybeAnnouncement, () => '')],
          ),
          h.submodel({
            slotId: 'picker',
            model: model.picker,
            view: Picker.view,
            toParentMessage: message => Message.GotPickerMessage({ message }),
          }),
        ],
      ),
    },
    h,
  ),
)
