import { Effect, Option } from 'effect'
import { beforeEach, expect, test, vi } from 'vitest'

import * as Poster from '../domain/poster'
import { twoItemGrid } from '../fixture'
import { ApiError, GridNotFoundError, fetchGrid, shareGrid } from './api'

// NOTE: Effect's FetchHttpClient reads `globalThis.fetch` once and keeps it, so
// the stub is installed once and each test only changes what it returns.
const fetchStub = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchStub)

const respondWith = (status: number, body: unknown) =>
  fetchStub.mockImplementation(async () => Response.json(body, { status }))

beforeEach(() => {
  fetchStub.mockReset()
})

test('a poster the API reports missing fails with GridNotFoundError', async () => {
  respondWith(404, { _tag: 'GridNotFound' })

  const error = await Effect.runPromise(Effect.flip(fetchGrid('AAAAAAAAAA')))

  expect(error).toBeInstanceOf(GridNotFoundError)
})

test('a malformed poster ID is not found without asking the API', async () => {
  const error = await Effect.runPromise(Effect.flip(fetchGrid('nope')))

  expect(error).toBeInstanceOf(GridNotFoundError)
  expect(fetchStub).not.toHaveBeenCalled()
})

test('a share refused by the rate limit explains why', async () => {
  respondWith(429, { _tag: 'TooManyShares' })

  const error = await Effect.runPromise(
    Effect.flip(
      shareGrid(
        Poster.toShareRequest(twoItemGrid, 'token').pipe(Option.getOrThrow),
      ),
    ),
  )

  expect(error).toBeInstanceOf(ApiError)
  expect(error.message).toBe('Too many shares. Try again in a minute.')
})

test('an unexpected response falls back to a generic message', async () => {
  respondWith(500, 'oops')

  const error = await Effect.runPromise(Effect.flip(fetchGrid('AAAAAAAAAA')))

  expect(error).toBeInstanceOf(ApiError)
  expect(error.message).toBe("Couldn't load this poster.")
})
