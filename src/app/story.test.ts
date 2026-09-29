import { Option, pipe } from 'effect'
import { AsyncData } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { expect, test } from 'vitest'

import * as Poster from './domain/poster'
import { twoItemGrid } from './fixture'
import { init } from './main'
import { Message } from './message'
import { Editor, Shared } from './page'
import { SaveDraft } from './page/editor/command'
import { FetchGrid } from './page/shared/command'
import { NavigateInternal, RestoreDraft, update } from './update'

const url = (path: string) =>
  Option.getOrThrow(fromString(`http://localhost${path}`))

const noDraft = { maybeDraft: Option.none(), maybeSharedPoster: Option.none() }

/** A saved draft that differs from the shared poster. */
const draftGrid = pipe(twoItemGrid, Poster.swapItems(0, 1))

const serverRendered = {
  maybeDraft: Option.none(),
  maybeSharedPoster: Option.some({ id: 'abc1234567', grid: twoItemGrid }),
}

test('opening a share link starts loading that poster', () => {
  const init_ = init(noDraft, url('/g/abc1234567'))

  expect(init_.model.route).toEqual({ _tag: 'Shared', id: 'abc1234567' })
  expect(init_.model.shared.maybeGridId).toEqual(Option.some('abc1234567'))
  expect(init_.commands?.map(({ name }) => name)).toEqual([FetchGrid.name])
})

test('the editor starts from the saved draft', () => {
  const init_ = init(
    { maybeDraft: Option.some(twoItemGrid), maybeSharedPoster: Option.none() },
    url('/'),
  )

  expect(init_.model.route._tag).toBe('Editor')
  expect(init_.model.editor.grid).toEqual(twoItemGrid)
})

test('a server-rendered poster starts loaded and restores the draft instead of fetching', () => {
  const init_ = init(serverRendered, url('/g/abc1234567'))

  expect(AsyncData.getData(init_.model.shared.grid)).toEqual(
    Option.some(twoItemGrid),
  )
  expect(init_.commands?.map(({ name }) => name)).toEqual([RestoreDraft.name])
})

test('the draft restored after a server-rendered page fills the empty editor', () => {
  story(
    update,
    given(init(serverRendered, url('/g/abc1234567')).model),
    message(
      Message.CompletedRestoreDraft({ maybeDraft: Option.some(twoItemGrid) }),
    ),
    model(({ editor }) => {
      expect(editor.grid).toEqual(twoItemGrid)
    }),
  )
})

test('a restored draft does not replace a poster already in the editor', () => {
  story(
    update,
    given(init(serverRendered, url('/g/abc1234567')).model),
    message(
      Message.GotSharedMessage({ message: Shared.Message.ClickedRemix() }),
    ),
    Command.resolve(SaveDraft, Editor.Message.CompletedSaveDraft()),
    Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    message(
      Message.CompletedRestoreDraft({
        maybeDraft: Option.some(draftGrid),
      }),
    ),
    model(({ editor }) => {
      expect(editor.grid).toEqual(twoItemGrid)
    }),
  )
})

test('remixing a shared poster loads it into the editor and goes there', () => {
  story(
    update,
    given(init(noDraft, url('/g/abc1234567')).model),
    message(
      Message.GotSharedMessage({
        message: Shared.Message.SucceededFetchGrid({
          gridId: 'abc1234567',
          grid: twoItemGrid,
        }),
      }),
    ),
    message(
      Message.GotSharedMessage({ message: Shared.Message.ClickedRemix() }),
    ),
    model(({ editor }) => {
      expect(editor.grid).toEqual(twoItemGrid)
    }),
    Command.resolve(SaveDraft, Editor.Message.CompletedSaveDraft()),
    Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    message(Message.ChangedUrl({ url: url('/') })),
    model(({ route, editor }) => {
      expect(route._tag).toBe('Editor')
      expect(editor.grid).toEqual(twoItemGrid)
    }),
  )
})

test('navigating to a different shared poster loads it', () => {
  story(
    update,
    given(init(noDraft, url('/')).model),
    message(Message.ChangedUrl({ url: url('/g/zzz9999999') })),
    model(({ route, shared }) => {
      expect(route).toEqual({ _tag: 'Shared', id: 'zzz9999999' })
      expect(shared.grid._tag).toBe('Loading')
    }),
    Command.resolve(
      FetchGrid,
      Shared.Message.FailedFetchGrid({
        gridId: 'zzz9999999',
        error: 'NotFound',
      }),
    ),
  )
})

test('returning to the poster already on screen does not reload it', () => {
  story(
    update,
    given(init(noDraft, url('/g/abc1234567')).model),
    message(
      Message.GotSharedMessage({
        message: Shared.Message.SucceededFetchGrid({
          gridId: 'abc1234567',
          grid: twoItemGrid,
        }),
      }),
    ),
    message(Message.ChangedUrl({ url: url('/') })),
    message(Message.ChangedUrl({ url: url('/g/abc1234567') })),
    Command.expectNone(),
  )
})

test('reopening a poster that failed to load tries again', () => {
  story(
    update,
    given(init(noDraft, url('/g/abc1234567')).model),
    message(
      Message.GotSharedMessage({
        message: Shared.Message.FailedFetchGrid({
          gridId: 'abc1234567',
          error: 'Unavailable',
        }),
      }),
    ),
    message(Message.ChangedUrl({ url: url('/') })),
    message(Message.ChangedUrl({ url: url('/g/abc1234567') })),
    Command.expectHas(FetchGrid({ gridId: 'abc1234567' })),
    Command.resolve(
      FetchGrid,
      Shared.Message.SucceededFetchGrid({
        gridId: 'abc1234567',
        grid: twoItemGrid,
      }),
    ),
  )
})
