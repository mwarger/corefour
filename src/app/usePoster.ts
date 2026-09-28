import { useEffect, useState } from "react";
import type { Game } from "../shared/types.ts";

export interface PosterState {
	title: string;
	subtitle: string;
	slots: (Game | null)[];
}

const STORAGE_KEY = "my9:draft";

export const emptyPoster = (): PosterState => ({
	title: "My 9 Games",
	subtitle: "The 9 Games That Shaped Who I Am",
	slots: Array(9).fill(null),
});

function loadDraft(): PosterState {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) return { ...emptyPoster(), ...JSON.parse(saved) };
	} catch {}
	return emptyPoster();
}

export function usePoster() {
	const [poster, setPoster] = useState(loadDraft);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(poster));
		} catch {}
	}, [poster]);

	const setSlot = (index: number, game: Game | null) =>
		setPoster((p) => ({
			...p,
			slots: p.slots.map((s, i) => (i === index ? game : s)),
		}));

	return { poster, setPoster, setSlot };
}
