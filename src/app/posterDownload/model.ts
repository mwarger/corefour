import { Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const Model = defineTaggedUnion({
  Idle: {},
  Downloading: {},
  Failed: { error: Schema.String },
})
export type Model = typeof Model.Type

export const init = (): Model => Model.Idle()

/** Forgets a failed download, e.g. once the poster it was for has changed. */
export const dismissError = (model: Model): Model =>
  Model.matchOrElse(model, { Failed: () => Model.Idle() }, () => model)

export const maybeError = (model: Model): Option.Option<string> =>
  Model.matchOrElse(model, { Failed: ({ error }) => Option.some(error) }, () =>
    Option.none(),
  )
