import { domToPng } from "modern-screenshot";
import { CATEGORIES } from "../shared/catalog.ts";
import type { Grid } from "../shared/types.ts";

export const EXPORT_WIDTH = 1080;

/** Renders the poster at a fixed width so exports look the same on any device. */
export async function downloadPoster(el: HTMLElement, filename: string) {
	await document.fonts.ready;
	const dataUrl = await domToPng(el, {
		scale: EXPORT_WIDTH / el.offsetWidth,
		filter: (node) => !(node instanceof Element && node.hasAttribute("data-export-ignore")),
	});
	const a = document.createElement("a");
	a.href = dataUrl;
	a.download = filename;
	a.click();
}

export const posterFilename = (grid: Grid) =>
	`${CATEGORIES[grid.category].title.replace(/\s+/g, "-").toLowerCase()}.png`;
