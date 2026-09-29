import { Data, Deferred, Duration, Effect, Option } from 'effect'

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
      callback: (token: string) => unknown
      'error-callback': () => unknown
      'expired-callback': () => unknown
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

const SCRIPT_ID = 'turnstile-api'

const loadFailure = () =>
  new TurnstileError({
    message: "Couldn't load verification. Check your connection and try again.",
  })

// NOTE: Turnstile is a third-party script with a callback API, so loading it
// and rendering its (hidden, invisible-mode) widget touch the DOM directly.
// A share started while the script is still loading waits on the same tag.
const loadApi = Effect.callback<TurnstileApi, TurnstileError>(resume => {
  const resumeWithApi = () =>
    resume(
      Option.match(Option.fromNullishOr(window.turnstile), {
        onSome: Effect.succeed,
        onNone: () => Effect.fail(loadFailure()),
      }),
    )

  if (window.turnstile) {
    resumeWithApi()
    return
  }

  const script = Option.getOrElse(
    Option.fromNullishOr(document.getElementById(SCRIPT_ID)),
    () => {
      const newScript = document.createElement('script')
      newScript.id = SCRIPT_ID
      newScript.src = SCRIPT_URL
      newScript.async = true
      document.head.appendChild(newScript)
      return newScript
    },
  )
  script.addEventListener('load', resumeWithApi, { once: true })
  script.addEventListener(
    'error',
    () => {
      script.remove()
      resume(Effect.fail(loadFailure()))
    },
    { once: true },
  )
})

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
      const tokenResult = yield* Deferred.make<string, TurnstileError>()
      const failVerification = () =>
        Deferred.doneUnsafe(
          tokenResult,
          Effect.fail(
            new TurnstileError({
              message: "Couldn't verify you're human. Please try again.",
            }),
          ),
        )
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          api.render(container, {
            sitekey: SITE_KEY,
            callback: token =>
              Deferred.doneUnsafe(tokenResult, Effect.succeed(token)),
            'error-callback': failVerification,
            'expired-callback': failVerification,
          }),
        ),
        widgetId => Effect.sync(() => api.remove(widgetId)),
      )
      return yield* Deferred.await(tokenResult)
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
