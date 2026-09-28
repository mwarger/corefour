import type { Item } from "../shared/types.ts";

export type CoverSize = "thumb" | "cover";

export const coverUrl = (item: Pick<Item, "source" | "image">, size: CoverSize = "cover") =>
	`/api/img/${item.source}/${size}/${item.image}`;
