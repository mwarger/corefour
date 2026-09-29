import { env } from 'cloudflare:workers'

export async function verifyTurnstile(
  token: string,
  ip: string | undefined,
): Promise<boolean> {
  const res = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        ...(ip && { remoteip: ip }),
      }),
    },
  )
  if (!res.ok) return false
  const { success } = (await res.json()) as { success: boolean }
  return success
}
