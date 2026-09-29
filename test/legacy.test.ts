import { Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { GridJson } from '../src/shared/schema.ts'
import { upgradeLegacyGrid } from '../src/worker/legacy.ts'

// A poster exactly as stored in production before the Foldkit port.
const LEGACY_POSTER =
  '{"v":2,"category":"games","subtitle":"raised-me","theme":"sage","items":[{"source":"igdb","id":"1103","name":"Super Metroid","image":"co5osy","year":1994},{"source":"igdb","id":"472","name":"The Elder Scrolls V: Skyrim","image":"cocs1l","year":2011},{"source":"igdb","id":"7046","name":"Factorio","image":"co1tfy","year":2020},{"source":"igdb","id":"254","name":"RollerCoaster Tycoon","image":"co2r6q","year":1999}]}'

const decodeGrid = Schema.decodeUnknownOption(GridJson)

describe('upgradeLegacyGrid', () => {
  it('upgrades a pre-port poster into the current format', () => {
    const grid = Option.getOrThrow(decodeGrid(upgradeLegacyGrid(LEGACY_POSTER)))
    expect(grid.category).toBe('Games')
    expect(grid.theme).toBe('Sage')
    expect(grid.subtitle).toBe('raised-me')
    expect(grid.items[0]).toEqual(
      Option.some({
        source: 'Igdb',
        id: '1103',
        name: 'Super Metroid',
        image: 'co5osy',
        maybeYear: Option.some(1994),
      }),
    )
  })

  it('leaves current-format posters untouched', () => {
    const current = upgradeLegacyGrid(LEGACY_POSTER)
    expect(upgradeLegacyGrid(current)).toBe(current)
  })
})
