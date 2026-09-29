import { Option, pipe } from 'effect'

import { Item, SearchResult } from '../shared/schema'
import * as Poster from './domain/poster'

export const zeldaResult = SearchResult.make({
  source: 'Igdb',
  id: '1029',
  name: 'The Legend of Zelda: Ocarina of Time',
  maybeYear: Option.some(1998),
  image: 'co3nnx',
  platforms: ['N64', 'Wii', '3DS', 'WiiU', 'Switch', 'GCN'],
  maybeKind: Option.none(),
})

export const zeldaRemakeResult = SearchResult.make({
  source: 'Igdb',
  id: '1039',
  name: 'The Legend of Zelda: Ocarina of Time 3D',
  maybeYear: Option.some(2011),
  image: 'co600u',
  platforms: ['3DS'],
  maybeKind: Option.some('Remake'),
})

export const zelda = Item.make({
  source: 'Igdb',
  id: '1029',
  name: 'The Legend of Zelda: Ocarina of Time',
  maybeYear: Option.some(1998),
  image: 'co3nnx',
})

export const crazyTaxi = Item.make({
  source: 'Igdb',
  id: '1805',
  name: 'Crazy Taxi',
  maybeYear: Option.some(1999),
  image: 'co7jt6',
})

/** Zelda in slot 1 and Crazy Taxi in slot 2; slots 3 and 4 empty. */
export const twoItemGrid = pipe(
  Poster.empty(),
  Poster.setItem(0, Option.some(zelda)),
  Poster.setItem(1, Option.some(crazyTaxi)),
)
