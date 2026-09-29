import type { SourceId } from '../../shared/catalog.ts'
import { igdb } from './igdb.ts'
import type { ImageSize, Source } from './types.ts'

export const SOURCES: Record<SourceId, Source> = { Igdb: igdb }

export const isSourceId = (value: string): value is SourceId =>
  Object.hasOwn(SOURCES, value)

const IMAGE_SIZES = new Set<string>([
  'thumb',
  'cover',
  'og',
] satisfies Array<ImageSize>)
export const isImageSize = (value: string): value is ImageSize =>
  IMAGE_SIZES.has(value)

export type { ImageSize, Source }
