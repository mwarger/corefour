import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { CATEGORIES, findSubtitle } from '../../shared/catalog'
import type { Grid, Item } from '../../shared/schema'
import {
  DOWNLOAD_IGNORE_ATTRIBUTE,
  POSTER_ELEMENT_ID,
} from '../resource/posterImage'

type CoverSize = 'thumb' | 'cover'

export const coverUrl = (
  item: Pick<Item, 'source' | 'image'>,
  size: CoverSize,
): string => `/api/img/${item.source}/${size}/${item.image}`

export const subtitleText = (grid: Grid): string =>
  Option.match(findSubtitle(grid.category, grid.subtitle), {
    onNone: () => '',
    onSome: ({ text }) => text,
  })

type PosterConfig = Readonly<{
  grid: Grid
  subtitle: Html
  slots: ReadonlyArray<Html>
}>

// NOTE: sizes use container query units so the poster scales as one piece
// and downloads identically at any width.
export const posterView = <Message>(
  { grid, subtitle, slots }: PosterConfig,
  h: HtmlBuilder<Message>,
): Html => {
  const category = CATEGORIES[grid.category]
  return h.div(
    [h.Class('@container w-full')],
    [
      h.div(
        [
          h.Id(POSTER_ELEMENT_ID),
          h.Class(
            'poster-bg flex flex-col items-center gap-[4cqw] px-[4cqw] py-[3.5cqw]',
          ),
        ],
        [
          h.header(
            [
              h.Class(
                'w-[62cqw] rounded-[3cqw] border border-black/10 bg-cream px-[3.5cqw] py-[2cqw] text-center shadow-sm',
              ),
            ],
            [
              h.h1(
                [
                  h.Class(
                    'text-[6.2cqw] leading-tight font-extrabold text-ink',
                  ),
                ],
                [category.title],
              ),
              subtitle,
            ],
          ),
          h.div([h.Class('grid w-full grid-cols-2 gap-[2.4cqw]')], slots),
          h.footer(
            [
              h.Class(
                'rounded-[3cqw] bg-cream/80 px-[5cqw] py-[0.9cqw] text-[2.2cqw] font-bold text-ink',
              ),
            ],
            [category.hashtag],
          ),
        ],
      ),
    ],
  )
}

export const readOnlySubtitleView = <Message>(
  grid: Grid,
  h: HtmlBuilder<Message>,
): Html =>
  h.p(
    [h.Class('truncate text-[2.4cqw] font-semibold text-ink/70')],
    [subtitleText(grid)],
  )

export const readOnlySlotView = <Message>(
  maybeItem: Option.Option<Item>,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(maybeItem, {
    onNone: () => emptySlotPlaceholderView(h),
    onSome: item => filledTileView(item, coverImageView(item, h), h),
  })

const emptySlotPlaceholderView = <Message>(h: HtmlBuilder<Message>): Html =>
  h.div([h.Class('aspect-[5/7] rounded-[2.6cqw] bg-white/40')])

export const coverImageView = <Message>(
  item: Item,
  h: HtmlBuilder<Message>,
): Html =>
  h.img([
    h.Src(coverUrl(item, 'cover')),
    h.Alt(item.name),
    h.Draggable(false),
    h.Class('size-full object-cover'),
  ])

/** A cover tile with its name label; `cover` is the image, or a button around it. */
export const filledTileView = <Message>(
  item: Item,
  cover: Html,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Class(
        'relative aspect-[5/7] overflow-hidden rounded-[2.6cqw] bg-ink shadow-[0_0.9cqw_1.8cqw_rgba(0,0,0,0.25)] ring-[0.6cqw] ring-ink',
      ),
    ],
    [
      cover,
      h.div(
        [
          h.Class(
            'pointer-events-none absolute inset-x-[1.5cqw] bottom-[1.5cqw] rounded-[0.75cqw] bg-cream/95 px-[1.8cqw] py-[1.4cqw] text-left text-[2.2cqw] leading-tight font-semibold text-ink',
          ),
        ],
        [item.name],
      ),
    ],
  )

/** Attribute that keeps an editing control out of the downloaded PNG. */
export const downloadIgnore = <Message>(h: HtmlBuilder<Message>) =>
  h.DataAttribute(DOWNLOAD_IGNORE_ATTRIBUTE, '')
