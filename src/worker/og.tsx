import { env } from 'cloudflare:workers'
import { Effect, Option } from 'effect'

import { cache, GoogleFont, render } from '@cf-wasm/og/workerd'
import { Resvg } from '@cf-wasm/resvg/legacy/workerd'

import { CATEGORIES, findSubtitle } from '../shared/catalog.ts'
import type { Grid, Item } from '../shared/schema.ts'
import { Execution } from './execution.ts'
import { OG_HEIGHT, OG_WIDTH, ogLayout, withBackground } from './ogLayout.tsx'
import { SOURCES } from './sources/index.ts'

async function coverDataUrl(item: Item): Promise<string | null> {
  const url = SOURCES[item.source].imageUrl('og', item.image)
  if (!url) return null
  const res = await fetch(url, {
    cf: { cacheEverything: true, cacheTtl: 31_536_000 },
  })
  if (!res.ok) return null
  const bytes = new Uint8Array(await res.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:image/jpeg;base64,${btoa(binary)}`
}

async function renderOgImage(
  grid: Grid,
  ctx: ExecutionContext,
): Promise<Uint8Array> {
  cache.setExecutionContext(ctx)
  const covers = await Promise.all(
    grid.items.map(maybeItem =>
      Option.match(maybeItem, {
        onNone: () => Promise.resolve(null),
        onSome: coverDataUrl,
      }),
    ),
  )
  const category = CATEGORIES[grid.category]
  const maybeSubtitle = Option.map(
    findSubtitle(grid.category, grid.subtitle),
    ({ text }) => text,
  )

  const { image: svg } = await render(
    ogLayout({
      title: category.title,
      maybeSubtitle,
      hashtag: category.hashtag,
      covers,
    }),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [
        new GoogleFont('Inter', { weight: 600 }),
        new GoogleFont('Inter', { weight: 800 }),
      ],
    },
  ).asSvg()

  const resvg = await Resvg.async(withBackground(svg), {
    fitTo: { mode: 'width', value: OG_WIDTH },
  })
  const image = resvg.render()
  const png = image.asPng()
  image.free()
  resvg.free()
  return png
}

/** Bump when the preview design changes; also busts crawler image caches. */
export const OG_VERSION = 3

const objectKey = (id: string) => `v${OG_VERSION}/${id}.png`

export const ogImagePath = (id: string) => `/api/og/${id}.png?v=${OG_VERSION}`

/**
 * Rendering takes a lot of CPU and is too slow for crawlers that fetch the
 * image with a short timeout. So previews are rendered once, when
 * the poster is shared, and stored in R2.
 */
export const ensureOgImage = (id: string, grid: Grid) =>
  Effect.gen(function* () {
    const key = objectKey(id)
    const existing = yield* Effect.promise(() => env.OG_IMAGES.get(key))
    if (existing !== null) {
      return yield* Effect.promise(() => existing.bytes())
    }

    const execution = yield* Execution
    const png = yield* Effect.promise(() => renderOgImage(grid, execution))
    yield* Effect.promise(() =>
      env.OG_IMAGES.put(key, png, {
        httpMetadata: { contentType: 'image/png' },
      }),
    )
    return png
  })
