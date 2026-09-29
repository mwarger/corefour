import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { Grid } from '../shared/schema'
import { Editor, Shared } from './page'

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedRestoreDraft: { maybeDraft: Schema.Option(Grid) },
  GotEditorMessage: { message: Editor.Message },
  GotSharedMessage: { message: Shared.Message },
})
export type Message = typeof Message.Type
