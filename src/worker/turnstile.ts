import { env } from 'cloudflare:workers'
import { Effect, Option, Schema } from 'effect'

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const SiteverifyResponse = Schema.Struct({ success: Schema.Boolean })
const decodeSiteverifyResponse = Schema.decodeUnknownEffect(SiteverifyResponse)

/** Whether Turnstile confirms the token. Any failure to check counts as no. */
export const verifyTurnstile = (
  token: string,
  maybeIp: Option.Option<string>,
) =>
  Effect.tryPromise(async () => {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        ...Option.match(maybeIp, {
          onNone: () => ({}),
          onSome: ip => ({ remoteip: ip }),
        }),
      }),
    })
    return response.ok ? await response.json() : { success: false }
  }).pipe(
    Effect.flatMap(decodeSiteverifyResponse),
    Effect.map(({ success }) => success),
    Effect.orElseSucceed(() => false),
  )
