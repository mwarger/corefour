import clsx from 'clsx'
import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

export type PageConfig = Readonly<{
  toolbar: ReadonlyArray<Html>
  notices: ReadonlyArray<Html>
  content: Html
}>

export const pageView = <Message>(
  { toolbar, notices, content }: PageConfig,
  h: HtmlBuilder<Message>,
): Html =>
  h.main(
    [
      h.Class(
        'mx-auto flex max-w-[800px] flex-col items-center gap-3 px-4 py-6',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'flex min-h-9 w-full flex-wrap items-center justify-end gap-2 text-sm text-ink/80',
          ),
        ],
        toolbar,
      ),
      // NOTE: the status region stays mounted even when empty, since screen
      // readers announce changes to live regions that already exist.
      h.div(
        [
          h.Role('status'),
          h.Class(
            clsx('w-full', {
              'flex flex-col gap-1 rounded-xl bg-cream px-4 py-2 text-sm text-ink':
                Array.isReadonlyArrayNonEmpty(notices),
            }),
          ),
        ],
        notices,
      ),
      content,
    ],
  )

export const posterFrameView = <Message>(
  poster: Html,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Class(
        'w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5',
      ),
    ],
    [poster],
  )

export type ActionButtonConfig<Message> = Readonly<{
  label: string
  onClick: Message
  isPrimary: boolean
  isBusy: boolean
  isDisabled: boolean
}>

export const actionButtonView = <Message>(
  {
    label,
    onClick,
    isPrimary,
    isBusy,
    isDisabled,
  }: ActionButtonConfig<Message>,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick,
      isDisabled: isDisabled || isBusy,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.AriaBusy(isBusy),
            h.AriaLabel(label),
            h.Class(
              clsx(
                'cursor-pointer rounded-full px-4 py-1.5 font-semibold transition data-[disabled]:cursor-default data-[disabled]:opacity-40',
                {
                  'bg-ink text-cream hover:bg-ink/85': isPrimary,
                  'hover:bg-ink/10': !isPrimary,
                },
              ),
            ),
          ],
          [isBusy ? '…' : label],
        ),
    },
    h,
  )

export const errorNoticeView = <Message>(
  message: string,
  h: HtmlBuilder<Message>,
): Html => h.p([h.Class('text-red-800')], [message])
