import { Subscription } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Editor } from './page'

export const subscriptions = Subscription.lift(Editor.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.editor,
  toParentMessage: message => Message.GotEditorMessage({ message }),
  when: ({ route }) => route._tag !== 'Shared',
})
