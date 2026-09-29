import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { Grid } from '../../../shared/schema'
import * as PosterDownload from '../../posterDownload'

export const LoadError = Schema.Literals(['NotFound', 'Unavailable'])
export type LoadError = typeof LoadError.Type

export const GridData = AsyncData.Schema(Grid, LoadError)

export const Model = Schema.Struct({
  maybeGridId: Schema.Option(Schema.String),
  grid: GridData.schema,
  posterDownload: PosterDownload.Model,
})
export type Model = typeof Model.Type
