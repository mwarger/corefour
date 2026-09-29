import { Submodel } from 'foldkit'

import { actionButtonView } from '../view/layout'
import { Message } from './message'
import { Model } from './model'

export type ViewInputs = Readonly<{
  filename: string
  isPrimary: boolean
  isDisabled: boolean
}>

/** The "Download PNG" button; the page shows `maybeError` in its notices. */
export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { filename, isPrimary, isDisabled }, h) =>
    actionButtonView(
      {
        label: 'Download PNG',
        onClick: Message.ClickedDownload({ filename }),
        isPrimary,
        isBusy: model._tag === 'Downloading',
        isDisabled,
      },
      h,
    ),
)
