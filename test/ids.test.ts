import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { GridId } from '../src/shared/schema.ts'
import { gridId } from '../src/worker/ids.ts'

describe('gridId', () => {
  it('is stable for the same content', async () => {
    expect(await gridId('{"a":1}')).toBe(await gridId('{"a":1}'))
  })

  it('differs for different content', async () => {
    expect(await gridId('{"a":1}')).not.toBe(await gridId('{"a":2}'))
  })

  it('matches the route pattern', async () => {
    expect(Schema.is(GridId)(await gridId('anything'))).toBe(true)
  })
})
