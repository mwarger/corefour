export type CoverSize = "cover_small" | "cover_big" | "cover_big_2x";

export const coverUrl = (imageId: string, size: CoverSize = "cover_big_2x") =>
	`/api/img/${size}/${imageId}`;
