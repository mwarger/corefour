const words = (s: string): string[] =>
  s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []

/** 0 = exact title match, 1 = title contains every query word, 2 = anything else. */
export function matchTier(name: string, query: string): number {
  const nameWords = words(name)
  const queryWords = words(query)
  if (nameWords.join(' ') === queryWords.join(' ')) return 0
  return queryWords.every(w => nameWords.includes(w)) ? 1 : 2
}

/**
 * Search APIs happily rank fan projects and obscure ports first. Prefer
 * titles that contain every query word, then the best-known entry by
 * popularity. Array#sort is stable, so ties keep the source's order.
 */
export function rankResults<T>(
  results: T[],
  query: string,
  name: (r: T) => string,
  popularity: (r: T) => number,
): T[] {
  return results
    .map(r => ({ r, tier: matchTier(name(r), query), pop: popularity(r) }))
    .sort((a, b) => a.tier - b.tier || b.pop - a.pop)
    .map(({ r }) => r)
}
