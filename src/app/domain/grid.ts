import { Array, Match, Option, Schema, String, pipe } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  DEFAULT_THEME,
  defaultSubtitleId,
} from '../../shared/catalog'
import { GRID_SIZE, Grid, type Item } from '../../shared/schema'

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

/** The slot a keyboard move lands on in the 2×2 grid, if there is one. */
export const neighborIndex = (
  index: number,
  direction: MoveDirection,
): Option.Option<number> => {
  const column = index % COLUMN_COUNT
  const target = Match.value(direction).pipe(
    Match.when('Left', () => (column > 0 ? index - 1 : -1)),
    Match.when('Right', () => (column < COLUMN_COUNT - 1 ? index + 1 : -1)),
    Match.when('Up', () => index - COLUMN_COUNT),
    Match.when('Down', () => index + COLUMN_COUNT),
    Match.exhaustive,
  )
  return Option.liftPredicate(
    target,
    candidate => candidate >= 0 && candidate < GRID_SIZE,
  )
}

export const posterFilename = (grid: Grid): string =>
  `${pipe(CATEGORIES[grid.category].title, String.toLowerCase, String.replaceAll(' ', '-'))}.png`
