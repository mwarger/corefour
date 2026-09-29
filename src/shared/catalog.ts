import { Array, Option, Schema, pipe } from 'effect'

/**
 * Everything a poster can say comes from this file or from a source database
 * (IGDB, ...). There is deliberately no free text: titles are fixed per
 * category and subtitles are picked from presets.
 */

export const SourceId = Schema.Literals(['Igdb'])
export type SourceId = typeof SourceId.Type

export const CategoryId = Schema.Literals(['Games'])
export type CategoryId = typeof CategoryId.Type

export const ThemeId = Schema.Literals(['Sage'])
export type ThemeId = typeof ThemeId.Type

export type Subtitle = Readonly<{ id: string; text: string }>

export type Category = Readonly<{
  title: string
  hashtag: string
  /** Singular noun for UI copy, e.g. "Search for game #3". */
  noun: string
  source: SourceId
  subtitles: Array.NonEmptyReadonlyArray<Subtitle>
}>

export const CATEGORIES: Readonly<Record<CategoryId, Category>> = {
  Games: {
    title: 'My Core Four',
    hashtag: '#CoreFour',
    noun: 'game',
    source: 'Igdb',
    subtitles: [
      { id: 'shaped', text: 'The 4 Games That Shaped Who I Am' },
      { id: 'favorites', text: 'My All-Time Favorites' },
      { id: 'desert-island', text: 'Desert Island Picks' },
      { id: 'comfort', text: 'My Comfort Games' },
      { id: 'raised-me', text: 'The Games That Raised Me' },
      { id: 'replay', text: 'Games I Could Replay Forever' },
      { id: 'underrated', text: 'Underrated Gems' },
      { id: 'best-ever', text: 'The Best Games Ever Made' },
    ],
  },
}

export const DEFAULT_CATEGORY: CategoryId = 'Games'
export const DEFAULT_THEME: ThemeId = 'Sage'

export const defaultSubtitleId = (category: CategoryId): string =>
  Array.headNonEmpty(CATEGORIES[category].subtitles).id

export const findSubtitle = (
  category: CategoryId,
  subtitleId: string,
): Option.Option<Subtitle> =>
  pipe(
    CATEGORIES[category].subtitles,
    Array.findFirst(({ id }) => id === subtitleId),
  )
