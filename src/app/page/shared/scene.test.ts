import { expect, given, role, scene, text } from 'foldkit/scene'
import { test } from 'vitest'

import { twoItemGrid, zelda } from '../../fixture'
import { GridData } from './model'
import { initIdle, update } from './update'
import { view } from './view'

const withGrid = (grid: typeof GridData.schema.Type) => ({
  ...initIdle(),
  gridId: 'abc1234567',
  grid,
})

test('a loaded poster is read-only with remix and download actions', () => {
  scene(
    { update, view },
    given(withGrid(GridData.Success({ data: twoItemGrid }))),
    expect(role('heading', { name: 'My Core Four' })).toExist(),
    expect(role('img', { name: zelda.name })).toExist(),
    expect(role('button', { name: `Change ${zelda.name}` })).toBeAbsent(),
    expect(role('button', { name: 'Remix' })).toExist(),
    expect(role('button', { name: 'Download PNG' })).toExist(),
    expect(role('link', { name: '← Make your own' })).toHaveAttr('href', '/'),
  )
})

test('a missing poster says so and links to the editor', () => {
  scene(
    { update, view },
    given(withGrid(GridData.Failure({ error: 'NotFound' }))),
    expect(text("This poster doesn't exist.", { exact: false })).toExist(),
    expect(role('link', { name: 'Make your own' })).toHaveAttr('href', '/'),
  )
})
