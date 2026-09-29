import { Schema } from 'effect'

import { Editor, Shared } from './page'
import { AppRoute } from './route'

export const Model = Schema.Struct({
  route: AppRoute,
  editor: Editor.Model,
  shared: Shared.Model,
})
export type Model = typeof Model.Type
