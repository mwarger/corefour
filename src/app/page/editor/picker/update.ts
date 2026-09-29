import { Array, Number, Option, Result, pipe } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

import type { CategoryId } from '../../../../shared/catalog'
import type { SearchResult } from '../../../../shared/schema'
import { SearchItems, WaitBeforeSearch } from './command'
import { Message, OutMessage } from './message'
import { Model, SearchResultsData } from './model'

const MIN_QUERY_LENGTH = 2

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

/** The trimmed query, when it is long enough to search. */
export const searchableQuery = (query: string): Option.Option<string> =>
  Option.liftPredicate(
    query.trim(),
    trimmed => trimmed.length >= MIN_QUERY_LENGTH,
  )

const clearSearch = (model: Model): Model =>
  modifyFields(model, {
    query: () => '',
    results: () => SearchResultsData.Idle(),
  })

const foldDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model: clearSearch(model) }),
})

const foldDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) =>
    modifyFields(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) =>
    modifyFields(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogClose = Update.foldChildStep({
  update: Dialog.close,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) =>
    modifyFields(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

export type OpenTarget = Readonly<{ slotIndex: number; category: CategoryId }>

/** Opens the picker with a fresh search for one poster slot. */
export const open =
  ({ slotIndex, category }: OpenTarget): Update.Step<Model, Message> =>
  model =>
    foldDialogOpen(
      modifyFields(clearSearch(model), {
        slotIndex: () => slotIndex,
        category: () => category,
        searchGeneration: Number.increment,
      }),
    )

const select = (model: Model, result: SearchResult): UpdateReturn =>
  pipe(
    foldDialogClose(model),
    Update.withOutMessage(
      OutMessage.SelectedResult({ slotIndex: model.slotIndex, result }),
    ),
  )

const settleSearch = (
  model: Model,
  query: string,
  result: Result.Result<ReadonlyArray<SearchResult>, string>,
): UpdateReturn =>
  query === model.query.trim()
    ? { model: modifyFields(model, { results: AsyncData.settle(result) }) }
    : { model }

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedQuery: ({ value }) => {
      const generation = model.searchGeneration + 1
      const nextModel = modifyFields(model, {
        query: () => value,
        searchGeneration: () => generation,
      })

      return Option.match(searchableQuery(value), {
        onNone: () => ({
          model: modifyFields(nextModel, {
            results: () => SearchResultsData.Idle(),
          }),
        }),
        onSome: () => ({
          model: modifyFields(nextModel, {
            results: results =>
              Option.getOrElse(
                AsyncData.revalidateOrLoad(results),
                () => results,
              ),
          }),
          commands: [WaitBeforeSearch({ generation })],
        }),
      })
    },

    CompletedWaitBeforeSearch: ({ generation }) =>
      generation === model.searchGeneration
        ? Option.match(searchableQuery(model.query), {
            onNone: () => ({ model }),
            onSome: query => ({
              model,
              commands: [SearchItems({ category: model.category, query })],
            }),
          })
        : { model },

    SucceededSearchItems: ({ query, results }) =>
      settleSearch(model, query, Result.succeed(results)),

    FailedSearchItems: ({ query, error }) =>
      settleSearch(model, query, Result.fail(error)),

    ClickedResult: ({ result }) => select(model, result),

    SubmittedSearch: () =>
      pipe(
        AsyncData.getData(model.results),
        Option.flatMap(Array.head),
        Option.match({
          onNone: () => ({ model }),
          onSome: result => select(model, result),
        }),
      ),

    GotDialogMessage: ({ message }) => foldDialog(model, message),
  })
