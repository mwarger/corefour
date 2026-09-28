import type { SourceId } from "../../shared/catalog.ts";
import { igdb } from "./igdb.ts";
import type { ImageSize, Source } from "./types.ts";

export const SOURCES: Record<SourceId, Source> = { igdb };

export const isSourceId = (v: string): v is SourceId => Object.hasOwn(SOURCES, v);

const IMAGE_SIZES = new Set<string>(["thumb", "cover", "og"] satisfies ImageSize[]);
export const isImageSize = (v: string): v is ImageSize => IMAGE_SIZES.has(v);

export type { ImageSize, Source };
