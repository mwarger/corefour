import { domToPng } from "modern-screenshot";

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

export const posterFilename = (title: string) =>
	`${title.trim().replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "my-9"}.png`;
