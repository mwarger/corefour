import { Array, Match, Option, Schema, String, pipe } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  DEFAULT_THEME,
  defaultSubtitleId,
} from '../../shared/catalog'
import { GRID_SIZE, Grid, type Item, ShareRequest } from '../../shared/schema'

const COLUMN_COUNT = 2

export const MoveDirection = Schema.Literals(['Up', 'Down', 'Left', 'Right'])
export type MoveDirection = typeof MoveDirection.Type

export const empty = (): Grid =>
  Grid.make({
    category: DEFAULT_CATEGORY,
    subtitle: defaultSubtitleId(DEFAULT_CATEGORY),
    theme: DEFAULT_THEME,
    items: Array.replicate(Option.none<Item>(), GRID_SIZE),
  })

export const itemAt = (grid: Grid, index: number): Option.Option<Item> =>
  pipe(Array.get(grid.items, index), Option.flatten)

export const setItem =
  (index: number, maybeItem: Option.Option<Item>) =>
  (grid: Grid): Grid =>
    modifyFields(grid, {
      items: Array.map((existing, itemIndex) =>
        itemIndex === index ? maybeItem : existing,
      ),
    })

export const swapItems =
  (from: number, to: number) =>
  (grid: Grid): Grid =>
    pipe(grid, setItem(to, itemAt(grid, from)), setItem(from, itemAt(grid, to)))

export const setSubtitle =
  (subtitleId: string) =>
  (grid: Grid): Grid =>
    modifyFields(grid, { subtitle: () => subtitleId })

export const filledCount = (grid: Grid): number =>
  Array.getSomes(grid.items).length

export const isEmpty = (grid: Grid): boolean => filledCount(grid) === 0

const isInGrid = (index: number): boolean => index >= 0 && index < GRID_SIZE

/** The slot a keyboard move lands on in the 2×2 grid, if there is one. */
export const neighborIndex = (
  index: number,
  direction: MoveDirection,
): Option.Option<number> => {
  const isFirstColumn = index % COLUMN_COUNT === 0
  const isLastColumn = index % COLUMN_COUNT === COLUMN_COUNT - 1
  return Match.value(direction).pipe(
    Match.withReturnType<Option.Option<number>>(),
    Match.when('Left', () =>
      Option.liftPredicate(index - 1, () => !isFirstColumn),
    ),
    Match.when('Right', () =>
      Option.liftPredicate(index + 1, () => !isLastColumn),
    ),
    Match.when('Up', () =>
      Option.liftPredicate(index - COLUMN_COUNT, isInGrid),
    ),
    Match.when('Down', () =>
      Option.liftPredicate(index + COLUMN_COUNT, isInGrid),
    ),
    Match.exhaustive,
  )
}

/** The file name a downloaded poster is saved as, e.g. `my-core-four.png`. */
export const posterFilename = (grid: Grid): string =>
  `${pipe(CATEGORIES[grid.category].title, String.toLowerCase, String.replaceAll(' ', '-'))}.png`

/** The references a share sends; `None` if the poster breaks a share rule. */
export const toShareRequest = (
  grid: Grid,
  turnstileToken: string,
): Option.Option<ShareRequest> =>
  ShareRequest.makeOption({
    category: grid.category,
    subtitle: grid.subtitle,
    theme: grid.theme,
    items: Array.map(
      grid.items,
      Option.map(({ source, id }) => ({ source, id })),
    ),
    turnstileToken,
  })
