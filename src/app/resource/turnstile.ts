import { Data, Duration, Effect, Option } from 'effect'

// NOTE: site keys are public. In dev this is Cloudflare's invisible test key,
// which always passes (paired with the test secret in .env).
const SITE_KEY = import.meta.env.DEV
  ? '1x00000000000000000000BB'
  : '0x4AAAAAAFIOBx02cnhc0Puz'

const VERIFICATION_TIMEOUT = Duration.seconds(30)

const SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = Readonly<{
  render: (
    element: HTMLElement,
    options: Readonly<{
      sitekey: string
      callback: (token: string) => void
      'error-callback': () => void
      'expired-callback': () => void
    }>,
  ) => string
  remove: (widgetId: string) => void
}>

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

/** The human check could not run or did not pass. */
export class TurnstileError extends Data.TaggedError('TurnstileError')<{
  readonly message: string
}> {}

// NOTE: Turnstile is a third-party script with a callback API, so loading it
// and rendering its (hidden, invisible-mode) widget touch the DOM directly.
const loadApi = Effect.callback<TurnstileApi, TurnstileError>(resume =>
  Option.match(Option.fromNullishOr(window.turnstile), {
    onSome: api => resume(Effect.succeed(api)),
    onNone: () => {
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.onload = () =>
        resume(
          Option.match(Option.fromNullishOr(window.turnstile), {
            onSome: Effect.succeed,
            onNone: () =>
              Effect.fail(
                new TurnstileError({
                  message: "Couldn't load verification. Please try again.",
                }),
              ),
          }),
        )
      script.onerror = () => {
        script.remove()
        resume(
          Effect.fail(
            new TurnstileError({
              message:
                "Couldn't load verification. Check your connection and try again.",
            }),
          ),
        )
      }
      document.head.appendChild(script)
    },
  }),
)

const hiddenContainer = Effect.acquireRelease(
  Effect.sync(() => {
    const element = document.createElement('div')
    element.hidden = true
    document.body.appendChild(element)
    return element
  }),
  element => Effect.sync(() => element.remove()),
)

/** Runs an invisible Turnstile challenge and resolves with a single-use token. */
export const getTurnstileToken: Effect.Effect<string, TurnstileError> =
  Effect.scoped(
    Effect.gen(function* () {
      const api = yield* loadApi
      const container = yield* hiddenContainer
      return yield* Effect.callback<string, TurnstileError>(resume => {
        const failVerification = () =>
          resume(
            Effect.fail(
              new TurnstileError({
                message: "Couldn't verify you're human. Please try again.",
              }),
            ),
          )
        const widgetId = api.render(container, {
          sitekey: SITE_KEY,
          callback: token => resume(Effect.succeed(token)),
          'error-callback': failVerification,
          'expired-callback': failVerification,
        })
        return Effect.sync(() => api.remove(widgetId))
      })
    }),
  ).pipe(
    Effect.timeoutOrElse({
      duration: VERIFICATION_TIMEOUT,
      orElse: () =>
        Effect.fail(
          new TurnstileError({
            message: 'Verification timed out. Please try again.',
          }),
        ),
    }),
  )
