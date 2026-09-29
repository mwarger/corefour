import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import * as Poster from '../../../domain/poster'
import { FocusSlot } from '../command'
import type { Message } from '../message'
import type { Model } from '../model'
import { editGrid } from './editGrid'
import type { UpdateReturn } from './update'

const announceMove =
  (maybeAnnouncement: Option.Option<string>): Update.Step<Model, Message> =>
  model => ({
    model: modifyFields(model, { maybeAnnouncement: () => maybeAnnouncement }),
  })

export const handlePressedMoveKey =
  (model: Model) =>
  ({
    slotIndex,
    direction,
  }: {
    slotIndex: number
    direction: Poster.MoveDirection
  }): UpdateReturn =>
    Option.match(Poster.neighborIndex(slotIndex, direction), {
      onNone: () => ({ model }),
      onSome: targetIndex =>
        Update.combine(model, [
          editGrid(Poster.swapItems(slotIndex, targetIndex)),
          announceMove(
            Option.map(
              Poster.itemAt(model.grid, slotIndex),
              ({ name }) => `Moved ${name} to position ${targetIndex + 1}`,
            ),
          ),
          stepModel => ({
            model: stepModel,
            commands: [FocusSlot({ slotIndex: targetIndex })],
          }),
        ]),
    })
