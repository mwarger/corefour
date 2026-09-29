import { expect, given, role, scene } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { test } from 'vitest'

import { twoItemGrid, zelda } from '../../fixture'
import { GridData } from './model'
import { initIdle, update } from './update'
import { view } from './view'

const withGrid = (grid: typeof GridData.schema.Type) =>
  modifyFields(initIdle(), { grid: () => grid })

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
    expect(role('heading', { name: "This poster doesn't exist." })).toExist(),
    expect(role('link', { name: 'Make your own' })).toHaveAttr('href', '/'),
  )
})

test('a poster that could not be loaded says so', () => {
  scene(
    { update, view },
    given(withGrid(GridData.Failure({ error: 'Unavailable' }))),
    expect(role('heading', { name: "Couldn't load this poster." })).toExist(),
  )
})

test('a poster that is still loading says so', () => {
  scene(
    { update, view },
    given(withGrid(GridData.Loading())),
    expect(role('heading', { name: 'Loading poster…' })).toExist(),
  )
})
