import { Option } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import * as PosterDownload from '../../posterDownload'
import { FetchGrid } from './command'
import { Message, OutMessage } from './message'
import { GridData, Model } from './model'

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

/** A shared-poster page with nothing loaded, while another route is active. */
export const initIdle = (): Model => ({
  maybeGridId: Option.none(),
  grid: GridData.Idle(),
  posterDownload: PosterDownload.init(),
})

export const init = (gridId: string): Update.Return<Model, Message> => ({
  model: {
    maybeGridId: Option.some(gridId),
    grid: GridData.Loading(),
    posterDownload: PosterDownload.init(),
  },
  commands: [FetchGrid({ gridId })],
})

/** Whether the page already shows (or is loading) this poster. */
export const isShowing = (model: Model, gridId: string): boolean =>
  Option.contains(model.maybeGridId, gridId) && !AsyncData.isFailure(model.grid)

const foldPosterDownload = Update.foldChild({
  update: PosterDownload.update,
  read: (model: Model) => Option.some(model.posterDownload),
  write: (model, nextPosterDownload) =>
    modifyFields(model, { posterDownload: () => nextPosterDownload }),
  toParentMessage: message => Message.GotPosterDownloadMessage({ message }),
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    SucceededFetchGrid: ({ grid }) => ({
      model: modifyFields(model, {
        grid: () => GridData.Success({ data: grid }),
      }),
    }),

    FailedFetchGrid: ({ error }) => ({
      model: modifyFields(model, { grid: () => GridData.Failure({ error }) }),
    }),

    ClickedRemix: () =>
      Option.match(AsyncData.getData(model.grid), {
        onNone: () => ({ model }),
        onSome: grid => ({
          model,
          outMessage: OutMessage.RequestedRemix({ grid }),
        }),
      }),

    GotPosterDownloadMessage: ({ message }) =>
      foldPosterDownload(model, message),
  })
