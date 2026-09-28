import { useCallback, useState } from "react";
import { GamePicker } from "./GamePicker.tsx";
import { Poster } from "./Poster.tsx";
import { emptyPoster, usePoster } from "./usePoster.ts";

export function App() {
	const { poster, setPoster, setSlot } = usePoster();
	const [picking, setPicking] = useState<number | null>(null);
	const closePicker = useCallback(() => setPicking(null), []);
	const filled = poster.slots.filter(Boolean).length;

	return (
		<main className="mx-auto flex max-w-[800px] flex-col items-center gap-4 px-4 py-6">
			<div className="flex w-full items-center justify-between text-sm text-ink/70">
				<span className="font-semibold">{filled} / 9 picked</span>
				<button
					type="button"
					onClick={() => setPoster(emptyPoster())}
					className="cursor-pointer rounded-full px-3 py-1 font-semibold hover:bg-ink/10"
				>
					Start over
				</button>
			</div>

			<div className="w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5">
				<Poster
					poster={poster}
					onTitleChange={(field, value) => setPoster((p) => ({ ...p, [field]: value }))}
					onPick={setPicking}
					onClear={(i) => setSlot(i, null)}
				/>
			</div>

			{picking !== null && (
				<GamePicker
					slotNumber={picking + 1}
					onClose={closePicker}
					onSelect={(game) => {
						setSlot(picking, game);
						setPicking(null);
					}}
				/>
			)}
		</main>
	);
}
