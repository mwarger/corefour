import { describe, expect, it } from "vitest";
import { matchTier, rankResults } from "../src/worker/sources/ranking.ts";

describe("matchTier", () => {
	it("scores exact, containing and other titles", () => {
		expect(matchTier("Black & White", "black & white")).toBe(0);
		expect(matchTier("The Legend of Zelda: Ocarina of Time", "ocarina of time")).toBe(1);
		expect(matchTier("Pokémon White Version 2", "black & white")).toBe(2);
	});
});

describe("rankResults", () => {
	const rank = (results: { name: string; pop: number }[], q: string) =>
		rankResults(results, q, (r) => r.name, (r) => r.pop).map((r) => r.name);

	it("prefers title matches over popularity", () => {
		expect(
			rank(
				[
					{ name: "Pokémon White Version 2", pop: 900 },
					{ name: "Black & White 2", pop: 100 },
					{ name: "Black & White", pop: 300 },
				],
				"black & white",
			),
		).toEqual(["Black & White", "Black & White 2", "Pokémon White Version 2"]);
	});

	it("ranks well-known releases above fan projects within a tier", () => {
		expect(
			rank(
				[
					{ name: "Unreal Engine The Legend of Zelda: Ocarina of Time", pop: 0 },
					{ name: "The Legend of Zelda: Ocarina of Time", pop: 2000 },
				],
				"ocarina of time",
			)[0],
		).toBe("The Legend of Zelda: Ocarina of Time");
	});

	it("keeps source order for ties", () => {
		expect(rank([{ name: "Crazy Taxi A", pop: 1 }, { name: "Crazy Taxi B", pop: 1 }], "crazy taxi")).toEqual([
			"Crazy Taxi A",
			"Crazy Taxi B",
		]);
	});
});
