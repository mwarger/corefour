import { Effect } from 'effect'
import { beforeAll, expect, test, vi } from 'vitest'

import { renderSharedPage } from './entry.server'
import { crazyTaxi, twoItemGrid, zelda } from './fixture'

const TEMPLATE = `<!doctype html>
<html lang="en">
  <head><title>My Core Four</title></head>
  <body><div id="root"></div></body>
</html>`

const FLAGS_SCRIPT =
  /<script type="application\/json" data-foldkit-flags="[^"]*">(.*?)<\/script>/s

const render = () =>
  Effect.runPromise(
    renderSharedPage({
      template: TEMPLATE,
      url: 'https://corefour.test/g/abc1234567',
      poster: { id: 'abc1234567', grid: twoItemGrid },
    }),
  )

beforeAll(() => {
  vi.stubEnv('FOLDKIT_BUILD_ID', 'test-build')
})

test('a shared poster renders to hydratable HTML with its games in the markup', async () => {
  const html = await render()

  const markup = html.replace(FLAGS_SCRIPT, '')

  expect(html).toContain('data-foldkit-build="test-build"')
  expect(html).toMatch(FLAGS_SCRIPT)
  expect(markup).toContain(zelda.name)
  expect(markup).toContain(crazyTaxi.name)
  expect(html).toContain('<title>A shared Core Four poster</title>')
  expect(html).not.toContain('<div id="root"></div>')
})

test('the embedded Flags carry the poster, not a draft', async () => {
  const html = await render()
  const flagsJson = html.match(FLAGS_SCRIPT)?.[1]

  expect(flagsJson).toBeDefined()
  expect(flagsJson).toContain('"abc1234567"')
  expect(flagsJson).toContain('"maybeDraft":{"_tag":"None"}')
})
