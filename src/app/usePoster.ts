import { useEffect, useState } from "react";
import { emptyGrid, normalizeGrid } from "../shared/draft.ts";
import type { Grid, Item } from "../shared/types.ts";

export const STORAGE_KEY = "corefour:draft";

function loadDraft(): Grid {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) return normalizeGrid(JSON.parse(saved));
	} catch {}
	return emptyGrid();
}

export function saveDraft(grid: Grid) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(grid));
	} catch {}
}

export function usePoster() {
	const [poster, setPoster] = useState(loadDraft);

	useEffect(() => saveDraft(poster), [poster]);

	const setItem = (index: number, item: Item | null) =>
		setPoster((p) => ({
			...p,
			items: p.items.map((s, i) => (i === index ? item : s)),
		}));

	const swapItems = (a: number, b: number) =>
		setPoster((p) => {
			const items = [...p.items];
			[items[a], items[b]] = [items[b], items[a]];
			return { ...p, items };
		});

	const setSubtitle = (subtitle: string) => setPoster((p) => ({ ...p, subtitle }));

	const reset = () => setPoster(emptyGrid());

	return { poster, setItem, swapItems, setSubtitle, reset };
}
