import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { itemFromSearchResult } from '../../../../shared/schema'
import * as Poster from '../../../domain/poster'
import * as PosterDownload from '../../../posterDownload'
import { Message } from '../message'
import { type Model } from '../model'
import * as Picker from '../picker'
import {
  handleCancelledPointer,
  handleCompletedWaitForLongPress,
  handleMovedPointer,
  handlePressedSlot,
  handleReleasedPointer,
} from './drag'
import { editGrid } from './editGrid'
import { handlePressedMoveKey } from './move'
import {
  handleClickedShareLink,
  handleFailedCopyShareUrl,
  handleFailedShareGrid,
  handleSucceededCopyShareUrl,
  handleSucceededShareGrid,
} from './share'

export type UpdateReturn = Update.Return<Model, Message>

const readPicker = (model: Model) => Option.some(model.picker)
const writePicker = (model: Model, nextPicker: Picker.Model): Model =>
  modifyFields(model, { picker: () => nextPicker })
const toGotPickerMessage = (message: Picker.Message): Message =>
  Message.GotPickerMessage({ message })

const foldPickerOutMessage = Picker.OutMessage.match<
  Update.Step<Model, Message>
>({
  SelectedResult: ({ slotIndex, result }) =>
    editGrid(
      Poster.setItem(slotIndex, Option.some(itemFromSearchResult(result))),
    ),
})

const foldPicker = Update.foldChild({
  update: Picker.update,
  read: readPicker,
  write: writePicker,
  toParentMessage: toGotPickerMessage,
  foldOutMessage: foldPickerOutMessage,
})

const openPicker = (target: Picker.OpenTarget) =>
  Update.foldChildStep({
    update: Picker.open(target),
    read: readPicker,
    write: writePicker,
    toParentMessage: toGotPickerMessage,
  })

const foldPosterDownload = Update.foldChild({
  update: PosterDownload.update,
  read: (model: Model) => Option.some(model.posterDownload),
  write: (model, nextPosterDownload) =>
    modifyFields(model, { posterDownload: () => nextPosterDownload }),
  toParentMessage: message => Message.GotPosterDownloadMessage({ message }),
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    SelectedSubtitle: ({ subtitleId }) =>
      editGrid(Poster.setSubtitle(subtitleId))(model),

    ClickedSlot: ({ slotIndex }) =>
      openPicker({ slotIndex, category: model.grid.category })(model),

    ClickedRemoveItem: ({ slotIndex }) =>
      editGrid(Poster.setItem(slotIndex, Option.none()))(model),

    ClickedStartOver: () => editGrid(Poster.empty)(model),

    ClickedShareLink: () => handleClickedShareLink(model),
    SucceededShareGrid: handleSucceededShareGrid(model),
    FailedShareGrid: handleFailedShareGrid(model),
    SucceededCopyShareUrl: handleSucceededCopyShareUrl(model),
    FailedCopyShareUrl: handleFailedCopyShareUrl(model),

    PressedSlot: handlePressedSlot(model),
    MovedPointer: handleMovedPointer(model),
    ReleasedPointer: () => handleReleasedPointer(model),
    CancelledPointer: () => handleCancelledPointer(model),
    CompletedWaitForLongPress: handleCompletedWaitForLongPress(model),
    PressedMoveKey: handlePressedMoveKey(model),

    CompletedSaveDraft: () => ({ model }),
    CompletedFocusSlot: () => ({ model }),

    GotPickerMessage: ({ message }) => foldPicker(model, message),
    GotPosterDownloadMessage: ({ message }) =>
      foldPosterDownload(model, message),
  })
