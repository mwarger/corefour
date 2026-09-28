import { describe, expect, it } from "vitest";
import { emptyGrid, normalizeGrid } from "../src/shared/draft.ts";

const zelda = {
	source: "igdb",
	id: "1029",
	name: "The Legend of Zelda: Ocarina of Time",
	year: 1998,
	image: "co3nnx",
};

describe("normalizeGrid", () => {
	it("keeps a valid grid", () => {
		const grid = { ...emptyGrid(), subtitle: "comfort", items: [zelda, null, null, null] };
		expect(normalizeGrid(grid)).toEqual(grid);
	});

	it("drops unknown fields, including free text", () => {
		const grid = normalizeGrid({ ...emptyGrid(), title: "typed by a user" });
		expect(grid).not.toHaveProperty("title");
	});

	it("resets unknown presets to defaults", () => {
		const grid = normalizeGrid({ ...emptyGrid(), subtitle: "not-a-preset", theme: "neon" });
		expect(grid.subtitle).toBe("shaped");
		expect(grid.theme).toBe("sage");
	});

	it("pads or trims items to the grid size and drops malformed ones", () => {
		expect(normalizeGrid({ items: [zelda] }).items).toEqual([zelda, null, null, null]);
		expect(normalizeGrid({ items: [zelda, zelda, zelda, zelda, zelda] }).items).toHaveLength(4);
		expect(normalizeGrid({ items: [{ source: "igdb", id: 5 }] }).items[0]).toBeNull();
	});

	it("falls back to an empty grid for garbage", () => {
		expect(normalizeGrid("garbage")).toEqual(emptyGrid());
		expect(normalizeGrid({ items: "nope" })).toEqual(emptyGrid());
	});
});
