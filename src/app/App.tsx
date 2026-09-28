import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { Grid } from "../shared/types.ts";
import { downloadPoster, posterFilename } from "./exportPng.ts";
import { GamePicker } from "./GamePicker.tsx";
import { Poster } from "./Poster.tsx";
import { emptyPoster, STORAGE_KEY, usePoster } from "./usePoster.ts";

export function App() {
	const shareId = location.pathname.match(/^\/g\/([0-9A-Za-z]{10})\/?$/)?.[1];
	return shareId ? <SharedView id={shareId} /> : <Editor />;
}

function Editor() {
	const { poster, setPoster, setSlot } = usePoster();
	const [picking, setPicking] = useState<number | null>(null);
	const [shareUrl, setShareUrl] = useState<string | null>(null);
	const posterRef = useRef<HTMLDivElement>(null);
	const closePicker = useCallback(() => setPicking(null), []);
	const filled = poster.slots.filter(Boolean).length;

	// Any edit invalidates the last share link.
	useEffect(() => setShareUrl(null), [poster]);

	const share = async () => {
		const res = await fetch("/api/grids", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(poster),
		});
		if (!res.ok) throw new Error(`Share failed: ${res.status}`);
		const { id } = (await res.json()) as { id: string };
		const url = `${location.origin}/g/${id}`;
		setShareUrl(url);
		await navigator.clipboard.writeText(url).catch(() => {});
	};

	return (
		<Layout
			toolbar={
				<>
					<span className="mr-auto font-semibold">{filled} / 9 picked</span>
					<ActionButton onClick={() => setPoster(emptyPoster())}>Start over</ActionButton>
					<ActionButton
						disabled={filled === 0}
						onClick={() => downloadPoster(posterRef.current!, posterFilename(poster.title))}
					>
						Download PNG
					</ActionButton>
					<ActionButton primary disabled={filled === 0} onClick={share}>
						Share link
					</ActionButton>
				</>
			}
			notice={
				shareUrl && (
					<>
						Link copied:{" "}
						<a href={shareUrl} className="font-semibold underline break-all">
							{shareUrl}
						</a>
					</>
				)
			}
		>
			<Poster
				ref={posterRef}
				poster={poster}
				edit={{
					onTitleChange: (field, value) => setPoster((p) => ({ ...p, [field]: value })),
					onPick: setPicking,
					onClear: (i) => setSlot(i, null),
				}}
			/>
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
		</Layout>
	);
}

function SharedView({ id }: { id: string }) {
	const [grid, setGrid] = useState<Grid | null | "missing">(null);
	const posterRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fetch(`/api/grids/${id}`)
			.then((r) => (r.ok ? (r.json() as Promise<Grid>) : null))
			.then((g) => setGrid(g ?? "missing"))
			.catch(() => setGrid("missing"));
	}, [id]);

	if (grid === "missing") {
		return (
			<Layout>
				<p className="py-20 text-center text-lg">
					This poster doesn't exist.{" "}
					<a href="/" className="font-semibold underline">
						Make your own
					</a>
				</p>
			</Layout>
		);
	}
	if (!grid) return <Layout />;

	const remix = () => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(grid));
		} catch {}
		location.href = "/";
	};

	return (
		<Layout
			toolbar={
				<>
					<a href="/" className="mr-auto font-semibold hover:underline">
						← Make your own
					</a>
					<ActionButton onClick={remix}>Remix</ActionButton>
					<ActionButton
						primary
						onClick={() => downloadPoster(posterRef.current!, posterFilename(grid.title))}
					>
						Download PNG
					</ActionButton>
				</>
			}
		>
			<Poster ref={posterRef} poster={grid} />
		</Layout>
	);
}

function Layout({
	toolbar,
	notice,
	children,
}: {
	toolbar?: ReactNode;
	notice?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<main className="mx-auto flex max-w-[800px] flex-col items-center gap-3 px-4 py-6">
			<div className="flex min-h-9 w-full flex-wrap items-center justify-end gap-2 text-sm text-ink/80">
				{toolbar}
			</div>
			{notice && (
				<p className="w-full rounded-xl bg-cream px-4 py-2 text-sm text-ink">{notice}</p>
			)}
			{children && (
				<div className="w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5">
					{children}
				</div>
			)}
		</main>
	);
}

function ActionButton({
	primary,
	disabled,
	onClick,
	children,
}: {
	primary?: boolean;
	disabled?: boolean;
	onClick: () => void | Promise<void>;
	children: ReactNode;
}) {
	const [busy, setBusy] = useState(false);
	return (
		<button
			type="button"
			disabled={disabled || busy}
			onClick={async () => {
				setBusy(true);
				try {
					await onClick();
				} catch (err) {
					console.error(err);
				} finally {
					setBusy(false);
				}
			}}
			className={`cursor-pointer rounded-full px-4 py-1.5 font-semibold transition disabled:cursor-default disabled:opacity-40 ${
				primary ? "bg-ink text-cream hover:bg-ink/85" : "hover:bg-ink/10"
			}`}
		>
			{busy ? "…" : children}
		</button>
	);
}
