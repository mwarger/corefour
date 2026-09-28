import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { migrateDraft } from "../shared/draft.ts";
import { type Grid, type ShareRequest, toItem } from "../shared/types.ts";
import { downloadPoster, posterFilename } from "./exportPng.ts";
import { ItemPicker } from "./ItemPicker.tsx";
import { Poster } from "./Poster.tsx";
import { getTurnstileToken } from "./turnstile.ts";
import { saveDraft, usePoster } from "./usePoster.ts";

export function App() {
	const shareId = location.pathname.match(/^\/g\/([0-9A-Za-z]{10})\/?$/)?.[1];
	return shareId ? <SharedView id={shareId} /> : <Editor />;
}

type Notice = { kind: "shared"; url: string } | { kind: "error"; text: string };

async function shareGrid(grid: Grid): Promise<string> {
	const body: ShareRequest = {
		category: grid.category,
		subtitle: grid.subtitle,
		theme: grid.theme,
		items: grid.items.map((i) => i && { source: i.source, id: i.id }),
		turnstileToken: await getTurnstileToken(),
	};
	const res = await fetch("/api/grids", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
	if (!res.ok || !data.id) throw new Error(data.error ?? "Sharing failed. Please try again.");
	return `${location.origin}/g/${data.id}`;
}

function Editor() {
	const { poster, setItem, swapItems, setSubtitle, reset } = usePoster();
	const [picking, setPicking] = useState<number | null>(null);
	const [notice, setNotice] = useState<Notice | null>(null);
	const posterRef = useRef<HTMLDivElement>(null);
	const closePicker = useCallback(() => setPicking(null), []);
	const filled = poster.items.filter(Boolean).length;

	// Any edit invalidates the last share link.
	useEffect(() => setNotice(null), [poster]);

	const share = async () => {
		try {
			const url = await shareGrid(poster);
			setNotice({ kind: "shared", url });
			await navigator.clipboard.writeText(url).catch(() => {});
		} catch (err) {
			setNotice({ kind: "error", text: (err as Error).message });
		}
	};

	return (
		<Layout
			toolbar={
				<>
					<span className="mr-auto font-semibold">{filled} / 9 picked</span>
					<ActionButton onClick={reset}>Start over</ActionButton>
					<ActionButton
						disabled={filled === 0}
						onClick={() => downloadPoster(posterRef.current!, posterFilename(poster))}
					>
						Download PNG
					</ActionButton>
					<ActionButton primary disabled={filled === 0} onClick={share}>
						Share link
					</ActionButton>
				</>
			}
			notice={
				notice?.kind === "shared" ? (
					<>
						Link copied:{" "}
						<a href={notice.url} className="font-semibold underline break-all">
							{notice.url}
						</a>
					</>
				) : notice?.kind === "error" ? (
					<span className="text-red-800">{notice.text}</span>
				) : null
			}
		>
			<Poster
				ref={posterRef}
				poster={poster}
				edit={{
					onSubtitleChange: setSubtitle,
					onPick: setPicking,
					onClear: (i) => setItem(i, null),
					onSwap: swapItems,
				}}
			/>
			{picking !== null && (
				<ItemPicker
					category={poster.category}
					slotNumber={picking + 1}
					onClose={closePicker}
					onSelect={(result) => {
						setItem(picking, toItem(result));
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
			.then((r) => (r.ok ? r.json() : null))
			// Browsers may hold pre-v2 grids in cache (responses are immutable).
			.then((g) => setGrid(g ? migrateDraft(g) : "missing"))
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
		saveDraft(grid);
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
						onClick={() => downloadPoster(posterRef.current!, posterFilename(grid))}
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
