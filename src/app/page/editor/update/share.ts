import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import * as Poster from '../../../domain/poster'
import { CopyShareUrl, ShareGrid } from '../command'
import type { Message } from '../message'
import { type Clipboard, type Model, ShareState } from '../model'
import type { UpdateReturn } from './update'

const isCurrentShare = (model: Model, generation: number): boolean =>
  ShareState.matchOrElse(
    model.share,
    { Sharing: sharing => sharing.generation === generation },
    () => false,
  )

const isShownUrl = (model: Model, url: string): boolean =>
  ShareState.matchOrElse(
    model.share,
    { Shared: shared => shared.url === url },
    () => false,
  )

const setClipboard =
  (url: string, clipboard: Clipboard): Update.Step<Model, Message> =>
  model =>
    isShownUrl(model, url)
      ? {
          model: modifyFields(model, {
            share: () => ShareState.Shared({ url, clipboard }),
          }),
        }
      : { model }

export const handleClickedShareLink = (model: Model): UpdateReturn => {
  if (model.share._tag === 'Sharing' || Poster.isEmpty(model.grid)) {
    return { model }
  }
  const generation = model.shareGeneration + 1
  return {
    model: modifyFields(model, {
      shareGeneration: () => generation,
      share: () => ShareState.Sharing({ generation }),
    }),
    commands: [ShareGrid({ grid: model.grid, generation })],
  }
}

/** Ignores results from shares the poster has since moved on from. */
export const handleSucceededShareGrid =
  (model: Model) =>
  ({ generation, url }: { generation: number; url: string }): UpdateReturn =>
    isCurrentShare(model, generation)
      ? {
          model: modifyFields(model, {
            share: () => ShareState.Shared({ url, clipboard: 'Copying' }),
          }),
          commands: [CopyShareUrl({ url })],
        }
      : { model }

export const handleFailedShareGrid =
  (model: Model) =>
  ({
    generation,
    error,
  }: {
    generation: number
    error: string
  }): UpdateReturn =>
    isCurrentShare(model, generation)
      ? {
          model: modifyFields(model, {
            share: () => ShareState.Failed({ error }),
          }),
        }
      : { model }

export const handleSucceededCopyShareUrl =
  (model: Model) =>
  ({ url }: { url: string }): UpdateReturn =>
    setClipboard(url, 'Copied')(model)

export const handleFailedCopyShareUrl =
  (model: Model) =>
  ({ url }: { url: string }): UpdateReturn =>
    setClipboard(url, 'NotCopied')(model)
