const LEGACY_NAMES: Readonly<Record<string, string>> = {
  games: 'Games',
  sage: 'Sage',
  igdb: 'Igdb',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !globalThis.Array.isArray(value)

// NOTE: posters shared before the Foldkit port used lowercase literals and a
// `year` key. They are converted in KV, but edge caches (cacheTtl) can still
// return the old shape for up to a day, so it is upgraded on read.
export const upgradeLegacyGrid = (json: string): string => {
  const parsed: unknown = JSON.parse(json)
  if (!isRecord(parsed) || parsed['v'] !== 2) {
    return json
  }
  const rename = (value: unknown) =>
    typeof value === 'string' ? (LEGACY_NAMES[value] ?? value) : value
  const items = globalThis.Array.isArray(parsed['items']) ? parsed['items'] : []
  return JSON.stringify({
    category: rename(parsed['category']),
    subtitle: parsed['subtitle'],
    theme: rename(parsed['theme']),
    items: items.map(item =>
      isRecord(item)
        ? {
            source: rename(item['source']),
            id: item['id'],
            name: item['name'],
            image: item['image'],
            ...(typeof item['year'] === 'number' && {
              maybeYear: item['year'],
            }),
          }
        : null,
    ),
  })
}
