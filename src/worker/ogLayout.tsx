import { Option } from 'effect'

// NOTE: satori renders JSX, so the Worker (only) depends on React's JSX runtime.
const INK = '#1f3a2c'
const CREAM = '#f8f3e3'
const FRAME = 3
// NOTE: IGDB's cover_small_2x covers are 180×240. A 240px-tall slot draws them
// unscaled, which keeps rasterizing within the Free plan's CPU budget.
const COVER_W = 172
const COVER_H = 240
const TILE_W = COVER_W + FRAME * 2
const TILE_H = COVER_H + FRAME * 2
const GAP = 16

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

// NOTE: satori paints CSS gradients through a full-size SVG pattern, which
// resvg rasterizes slowly. Adding a plain gradient rect behind satori's output
// looks the same for a fraction of the CPU.
const BACKGROUND = `<defs><linearGradient id="og-background" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d5e6d3"/><stop offset="0.55" stop-color="#e7eedc"/><stop offset="1" stop-color="#eef0e0"/></linearGradient></defs><rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#og-background)"/>`

export const withBackground = (svg: string) =>
  svg.replace(/^<svg[^>]*>/, openingTag => openingTag + BACKGROUND)

export type OgContent = Readonly<{
  title: string
  maybeSubtitle: Option.Option<string>
  hashtag: string
  covers: ReadonlyArray<string | null>
}>

/**
 * 1200×630 link-preview layout: title on the left, the 2×2 covers on the right.
 * The background is transparent; `withBackground` adds it to satori's SVG.
 */
export const ogLayout = ({
  title,
  maybeSubtitle,
  hashtag,
  covers,
}: OgContent) => (
  <div
    style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      padding: '36px 56px',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: 'Inter',
      color: INK,
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 560,
        gap: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '28px 32px',
          borderRadius: 24,
          background: CREAM,
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>
          {title}
        </div>
        {Option.match(maybeSubtitle, {
          onNone: () => null,
          onSome: text => (
            <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.7 }}>
              {text}
            </div>
          ),
        })}
      </div>
      <div style={{ display: 'flex' }}>
        <div
          style={{
            padding: '8px 22px',
            borderRadius: 999,
            background: 'rgba(248,243,227,0.85)',
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          {hashtag}
        </div>
      </div>
    </div>

    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        width: TILE_W * 2 + GAP,
        gap: GAP,
      }}
    >
      {covers.map((src, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            width: TILE_W,
            height: TILE_H,
            padding: FRAME,
            borderRadius: 16,
            background: src ? INK : 'rgba(255,255,255,0.4)',
          }}
        >
          {src && (
            <img
              src={src}
              width={COVER_W}
              height={COVER_H}
              style={{ objectFit: 'cover', borderRadius: 13 }}
            />
          )}
        </div>
      ))}
    </div>
  </div>
)
