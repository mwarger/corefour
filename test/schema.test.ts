import { Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { GridJson, ShareRequestJson } from '../src/shared/schema.ts'

const decodeShareRequest = Schema.decodeUnknownOption(ShareRequestJson)
const decodeGridJson = Schema.decodeUnknownOption(GridJson)

const validRequest = () => ({
  category: 'Games',
  subtitle: 'shaped',
  theme: 'Sage',
  items: [{ source: 'Igdb', id: '1029' }, null, null, null],
  turnstileToken: 'token',
})

const zelda = {
  source: 'Igdb',
  id: '1029',
  name: 'The Legend of Zelda: Ocarina of Time',
  maybeYear: 1998,
  image: 'co3nnx',
}

describe('ShareRequest', () => {
  it('accepts a valid request', () => {
    const decoded = decodeShareRequest(validRequest())
    expect(Option.isSome(decoded)).toBe(true)
  })

  it('drops free-text fields and item details instead of keeping them', () => {
    const decoded = Option.getOrThrow(
      decodeShareRequest({
        ...validRequest(),
        title: 'anything a user typed',
        items: [
          { source: 'Igdb', id: '1029', name: 'Fake Name', image: 'evil' },
          null,
          null,
          null,
        ],
      }),
    )
    expect(decoded).not.toHaveProperty('title')
    expect(decoded.items[0]).toEqual(
      Option.some({ source: 'Igdb', id: '1029' }),
    )
  })

  it.each([
    ['unknown category', { category: 'Memes' }],
    ['free-text subtitle', { subtitle: 'The 4 Games That Shaped Who I Am' }],
    ['unknown theme', { theme: 'Neon' }],
    ['missing token', { turnstileToken: undefined }],
    ['wrong item count', { items: [{ source: 'Igdb', id: '1' }] }],
    ['all empty', { items: [null, null, null, null] }],
    [
      'non-numeric IGDB id',
      { items: [{ source: 'Igdb', id: '1; drop' }, null, null, null] },
    ],
    [
      'unknown source',
      { items: [{ source: 'Evil', id: '1' }, null, null, null] },
    ],
  ])('rejects %s', (_, patch) => {
    expect(
      Option.isNone(decodeShareRequest({ ...validRequest(), ...patch })),
    ).toBe(true)
  })

  it('rejects non-objects', () => {
    expect(Option.isNone(decodeShareRequest(null))).toBe(true)
    expect(Option.isNone(decodeShareRequest('nope'))).toBe(true)
  })
})

describe('GridJson', () => {
  const gridJson = (patch: object = {}) =>
    JSON.stringify({
      category: 'Games',
      subtitle: 'comfort',
      theme: 'Sage',
      items: [zelda, null, null, null],
      ...patch,
    })

  it('round-trips a grid, with absent years omitted', () => {
    const grid = Option.getOrThrow(decodeGridJson(gridJson()))
    expect(grid.items[0]).toEqual(
      Option.some({ ...zelda, maybeYear: Option.some(1998) }),
    )
    expect(JSON.parse(Schema.encodeSync(GridJson)(grid))).toEqual(
      JSON.parse(gridJson()),
    )
  })

  it('drops unknown fields, including free text', () => {
    const grid = Option.getOrThrow(
      decodeGridJson(gridJson({ title: 'typed by a user' })),
    )
    expect(grid).not.toHaveProperty('title')
  })

  it.each([
    ['unknown subtitle', { subtitle: 'not-a-preset' }],
    ['wrong item count', { items: [zelda] }],
    [
      'malformed item',
      { items: [{ source: 'Igdb', id: 5 }, null, null, null] },
    ],
  ])('rejects %s', (_, patch) => {
    expect(Option.isNone(decodeGridJson(gridJson(patch)))).toBe(true)
  })

  it('rejects garbage', () => {
    expect(Option.isNone(decodeGridJson('garbage'))).toBe(true)
  })
})
