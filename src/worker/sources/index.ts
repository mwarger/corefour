import type { SourceId } from '../../shared/catalog.ts'
import { igdb } from './igdb.ts'
import type { Source } from './types.ts'

export const SOURCES: Record<SourceId, Source> = { Igdb: igdb }

export type { Source }
