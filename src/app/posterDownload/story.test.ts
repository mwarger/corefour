import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { DownloadPoster } from './command'
import { Message } from './message'
import { Model, dismissError, init } from './model'
import { update } from './update'

test('downloading saves the poster under the given file name', () => {
  story(
    update,
    given(init()),
    message(Message.ClickedDownload({ filename: 'my-core-four.png' })),
    Command.expectExact(DownloadPoster({ filename: 'my-core-four.png' })),
    model(downloadState => {
      expect(downloadState._tag).toBe('Downloading')
    }),
    Command.resolve(DownloadPoster, Message.SucceededDownloadPoster()),
    model(downloadState => {
      expect(downloadState).toEqual(Model.Idle())
    }),
  )
})

test('a second click while downloading is ignored', () => {
  story(
    update,
    given(Model.Downloading()),
    message(Message.ClickedDownload({ filename: 'my-core-four.png' })),
    Command.expectNone(),
  )
})

test('a failed download keeps the reason until it is dismissed', () => {
  story(
    update,
    given(init()),
    message(Message.ClickedDownload({ filename: 'my-core-four.png' })),
    Command.resolve(
      DownloadPoster,
      Message.FailedDownloadPoster({ error: "Couldn't create the image." }),
    ),
    model(downloadState => {
      expect(downloadState).toEqual(
        Model.Failed({ error: "Couldn't create the image." }),
      )
      expect(dismissError(downloadState)).toEqual(Model.Idle())
    }),
  )
})
