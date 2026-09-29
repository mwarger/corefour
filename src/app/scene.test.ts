import { Option } from 'effect'
import { expect, given, role, scene } from 'foldkit/scene'
import { fromString } from 'foldkit/url'
import { test } from 'vitest'

import { init } from './main'
import { update } from './update'
import { view } from './view'

const modelAt = (path: string) =>
  init(
    { maybeDraft: Option.none() },
    Option.getOrThrow(fromString(`http://localhost${path}`)),
  ).model

test('an unknown address shows a not-found page instead of the editor', () => {
  scene(
    { update, view },
    given(modelAt('/nope')),
    expect(role('heading', { name: "There's nothing at /nope." })).toExist(),
    expect(role('link', { name: 'Make your own' })).toHaveAttr('href', '/'),
    expect(role('button', { name: 'Share link' })).toBeAbsent(),
  )
})

test('the home page shows the editor', () => {
  scene(
    { update, view },
    given(modelAt('/')),
    expect(role('heading', { name: 'My Core Four' })).toExist(),
    expect(role('button', { name: 'Share link' })).toExist(),
  )
})
