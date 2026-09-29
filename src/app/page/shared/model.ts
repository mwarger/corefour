import { Schema } from 'effect'
import { AsyncData } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'

import { Grid } from '../../../shared/schema'

export const LoadError = Schema.Literals(['NotFound', 'Unavailable'])
export type LoadError = typeof LoadError.Type

export const GridData = AsyncData.Schema(Grid, LoadError)

export const ExportState = defineTaggedUnion({
  Idle: {},
  Exporting: {},
  Failed: { error: Schema.String },
})

export const Model = Schema.Struct({
  gridId: Schema.String,
  grid: GridData.schema,
  imageExport: ExportState,
})
export type Model = typeof Model.Type
