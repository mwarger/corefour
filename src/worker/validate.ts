import { isCategoryId, isThemeId, SOURCE_ID_PATTERNS, subtitleText } from "../shared/catalog.ts";
import { GRID_SIZE, type ItemRef, type ShareRequest } from "../shared/types.ts";

function parseRef(v: unknown): ItemRef | null | undefined {
	if (v === null) return null;
	if (typeof v !== "object") return undefined;
	const { source, id } = v as Record<string, unknown>;
	if (source !== "igdb" || typeof id !== "string" || !SOURCE_ID_PATTERNS[source].test(id)) {
		return undefined;
	}
	return { source, id };
}

/**
 * Validates an untrusted share request. Only catalog IDs and item references
 * survive; any other field (e.g. a free-text title) is dropped.
 */
export function parseShareRequest(v: unknown): ShareRequest | null {
	if (typeof v !== "object" || v === null) return null;
	const r = v as Record<string, unknown>;
	if (!isCategoryId(r.category) || !isThemeId(r.theme)) return null;
	if (typeof r.subtitle !== "string" || !subtitleText(r.category, r.subtitle)) return null;
	if (typeof r.turnstileToken !== "string" || r.turnstileToken.length > 4096) return null;
	if (!Array.isArray(r.items) || r.items.length !== GRID_SIZE) return null;

	const items = r.items.map(parseRef);
	if (items.includes(undefined) || items.every((i) => i === null)) return null;
	return {
		category: r.category,
		subtitle: r.subtitle,
		theme: r.theme,
		items: items as (ItemRef | null)[],
		turnstileToken: r.turnstileToken,
	};
}
