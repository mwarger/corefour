import { Data, Effect, Option } from 'effect'
import { domToPng } from 'modern-screenshot'

/** Width of the downloaded PNG in pixels, whatever the screen size. */
const DOWNLOAD_WIDTH = 1080

/** Elements carrying this data attribute (editing controls) are left out of downloads. */
export const DOWNLOAD_IGNORE_ATTRIBUTE = 'download-ignore'

/** Creating or saving the poster image failed. */
export class DownloadError extends Data.TaggedError('DownloadError')<{
  readonly message: string
}> {}

// NOTE: the DOM-to-image library needs the live poster element, and saving a
// generated file is done with a download link, so this reaches into the DOM.
export const downloadPosterPng = (elementId: string, filename: string) =>
  Effect.gen(function* () {
    const element = yield* Option.match(
      Option.fromNullishOr(document.getElementById(elementId)),
      {
        onNone: () =>
          Effect.fail(new DownloadError({ message: 'Poster not found.' })),
        onSome: Effect.succeed,
      },
    )
    yield* Effect.promise(() => document.fonts.ready)
    const dataUrl = yield* Effect.tryPromise({
      try: () =>
        domToPng(element, {
          scale: DOWNLOAD_WIDTH / element.offsetWidth,
          filter: node =>
            !(
              node instanceof Element &&
              node.hasAttribute(`data-${DOWNLOAD_IGNORE_ATTRIBUTE}`)
            ),
        }),
      catch: () => new DownloadError({ message: "Couldn't create the image." }),
    })
    yield* Effect.sync(() => {
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = filename
      link.click()
    })
  })
