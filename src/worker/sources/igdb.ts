import { env } from 'cloudflare:workers'
import { Option } from 'effect'

import type { ImageSize } from '../../shared/api.ts'
import { Item, SearchResult } from '../../shared/schema.ts'
import { rankResults } from './ranking.ts'
import type { Source } from './types.ts'

const TOKEN_KEY = 'igdb:token'

async function getToken(): Promise<string> {
  const cached = await env.KV.get(TOKEN_KEY)
  if (cached) return cached

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: env.IGDB_CLIENT_ID,
      client_secret: env.IGDB_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  })
  if (!res.ok) throw new Error(`Twitch token request failed: ${res.status}`)
  const { access_token, expires_in } = (await res.json()) as {
    access_token: string
    expires_in: number
  }
  // Refresh a day early; tokens last ~60 days.
  await env.KV.put(TOKEN_KEY, access_token, {
    expirationTtl: Math.max(60, expires_in - 86_400),
  })
  return access_token
}

async function query<T>(body: string): Promise<T[]> {
  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': env.IGDB_CLIENT_ID,
      Authorization: `Bearer ${await getToken()}`,
    },
    body,
  })
  if (res.status === 401) await env.KV.delete(TOKEN_KEY)
  if (!res.ok) throw new Error(`IGDB request failed: ${res.status}`)
  return res.json()
}

interface IgdbGame {
  id: number
  name: string
  first_release_date?: number
  cover?: { image_id: string }
  total_rating_count?: number
  platforms?: { name: string; abbreviation?: string }[]
  game_type?: number
}

// IGDB game_type ids we search (0 = main game, which gets no label).
const KIND_LABELS: Record<number, string> = {
  8: 'Remake',
  9: 'Remaster',
  10: 'Expanded',
  11: 'Port',
}

const toItem = (g: IgdbGame): Item =>
  Item.make({
    source: 'Igdb',
    id: String(g.id),
    name: g.name,
    image: g.cover!.image_id,
    maybeYear: Option.map(Option.fromNullishOr(g.first_release_date), seconds =>
      new Date(seconds * 1000).getUTCFullYear(),
    ),
  })

const IMAGE_SIZES: Record<ImageSize, string> = {
  thumb: 'cover_small',
  cover: 'cover_big_2x',
  og: 'cover_small_2x',
}

export const igdb: Source = {
  async search(q) {
    // IGDB's query language uses double quotes and semicolons as syntax.
    const clean = q.replace(/["\;]/g, ' ').trim().slice(0, 80)
    if (!clean) return []

    const games = await query<IgdbGame>(
      `search "${clean}"; fields name,first_release_date,cover.image_id,total_rating_count,platforms.name,platforms.abbreviation,game_type; where cover != null & version_parent = null & game_type = (0,8,9,10,11); limit 30;`,
    )
    return rankResults(
      games,
      clean,
      g => g.name,
      g => g.total_rating_count ?? 0,
    )
      .slice(0, 20)
      .map(g =>
        SearchResult.make({
          ...toItem(g),
          platforms: (g.platforms ?? []).map(p => p.abbreviation ?? p.name),
          maybeKind: Option.fromNullishOr(
            g.game_type === undefined ? undefined : KIND_LABELS[g.game_type],
          ),
        }),
      )
  },

  async lookup(ids) {
    if (ids.length === 0) return new Map<string, Item>()
    const games = await query<IgdbGame>(
      `fields name,first_release_date,cover.image_id; where id = (${ids.join(',')}) & cover != null; limit ${ids.length};`,
    )
    return new Map(games.map(g => [String(g.id), toItem(g)]))
  },

  imageUrl(size, key) {
    if (!/^[a-z0-9]{1,32}$/.test(key)) return null
    return `https://images.igdb.com/igdb/image/upload/t_${IMAGE_SIZES[size]}/${key}.jpg`
  },
}
