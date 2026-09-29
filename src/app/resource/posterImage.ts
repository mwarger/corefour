import { Data, Effect, Option } from 'effect'
import { domToPng } from 'modern-screenshot'

/** Width of the exported PNG in pixels, whatever the screen size. */
const EXPORT_WIDTH = 1080

/** Elements carrying this data attribute (editing controls) are left out of exports. */
export const EXPORT_IGNORE_ATTRIBUTE = 'export-ignore'

/** Creating or saving the poster image failed. */
export class ExportError extends Data.TaggedError('ExportError')<{
  readonly message: string
}> {}

// NOTE: the DOM-to-image library needs the live poster element, and saving a
// generated file is done with a download link, so this reaches into the DOM.
export const exportPosterPng = (elementId: string, filename: string) =>
  Effect.gen(function* () {
    const element = yield* Option.match(
      Option.fromNullishOr(document.getElementById(elementId)),
      {
        onNone: () =>
          Effect.fail(new ExportError({ message: 'Poster not found.' })),
        onSome: Effect.succeed,
      },
    )
    yield* Effect.promise(() => document.fonts.ready)
    const dataUrl = yield* Effect.tryPromise({
      try: () =>
        domToPng(element, {
          scale: EXPORT_WIDTH / element.offsetWidth,
          filter: node =>
            !(
              node instanceof Element &&
              node.hasAttribute(`data-${EXPORT_IGNORE_ATTRIBUTE}`)
            ),
        }),
      catch: () => new ExportError({ message: "Couldn't create the image." }),
    })
    yield* Effect.sync(() => {
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = filename
      link.click()
    })
  })
