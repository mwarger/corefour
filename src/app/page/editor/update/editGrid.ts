import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import type { Grid } from '../../../../shared/schema'
import * as PosterDownload from '../../../posterDownload'
import { SaveDraft } from '../command'
import type { Message } from '../message'
import { type Model, ShareState } from '../model'

/**
 * Applies an edit to the poster: saves the draft, and drops the share link
 * and any download error, since both belonged to the previous version.
 */
export const editGrid =
  (edit: (grid: Grid) => Grid): Update.Step<Model, Message> =>
  model => {
    const grid = edit(model.grid)
    return {
      model: modifyFields(model, {
        grid: () => grid,
        share: () => ShareState.Idle(),
        posterDownload: PosterDownload.dismissError,
      }),
      commands: [SaveDraft({ grid })],
    }
  }
