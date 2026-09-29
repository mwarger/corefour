import type { Item, SearchResult } from '../../shared/schema.ts'

export type ImageSize = 'thumb' | 'cover' | 'og'

export interface Source {
  search(query: string): Promise<ReadonlyArray<SearchResult>>
  /** Resolves already-validated IDs to canonical items, keyed by ID. */
  lookup(ids: ReadonlyArray<string>): Promise<ReadonlyMap<string, Item>>
  /** Upstream image URL, or null if the key isn't valid for this source. */
  imageUrl(size: ImageSize, key: string): string | null
}
