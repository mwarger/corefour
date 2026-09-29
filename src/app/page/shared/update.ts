import { AsyncData, type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { posterFilename } from '../../domain/grid'
import { ExportPoster, FetchGrid } from './command'
import { Message, OutMessage } from './message'
import { ExportState, GridData, Model } from './model'

/** A shared-poster page that has not loaded anything (another route is active). */
export const initIdle = (): Model => ({
  gridId: '',
  grid: GridData.Idle(),
  imageExport: ExportState.Idle(),
})

export const init = (gridId: string): Update.Return<Model, Message> => ({
  model: {
    gridId,
    grid: GridData.Loading(),
    imageExport: ExportState.Idle(),
  },
  commands: [FetchGrid({ gridId })],
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      SucceededFetchGrid: ({ grid }) => ({
        model: modifyFields(model, {
          grid: () => GridData.Success({ data: grid }),
        }),
      }),

      FailedFetchGrid: ({ error }) => ({
        model: modifyFields(model, { grid: () => GridData.Failure({ error }) }),
      }),

      ClickedRemix: () =>
        AsyncData.matchDataSplitEmpty(model.grid, {
          onIdle: () => ({ model }),
          onLoading: () => ({ model }),
          onFailure: () => ({ model }),
          onData: grid => ({
            model,
            outMessage: OutMessage.RequestedRemix({ grid }),
          }),
        }),

      ClickedDownloadPng: () =>
        AsyncData.matchDataSplitEmpty(model.grid, {
          onIdle: () => ({ model }),
          onLoading: () => ({ model }),
          onFailure: () => ({ model }),
          onData: grid =>
            model.imageExport._tag === 'Exporting'
              ? { model }
              : {
                  model: modifyFields(model, {
                    imageExport: () => ExportState.Exporting(),
                  }),
                  commands: [ExportPoster({ filename: posterFilename(grid) })],
                },
        }),

      SucceededExportPoster: () => ({
        model: modifyFields(model, { imageExport: () => ExportState.Idle() }),
      }),

      FailedExportPoster: ({ error }) => ({
        model: modifyFields(model, {
          imageExport: () => ExportState.Failed({ error }),
        }),
      }),
    },
  )
