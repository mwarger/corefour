import { describe, expect, it } from "vitest";
import { GRID_ID_PATTERN, gridId } from "../src/worker/ids.ts";

describe("gridId", () => {
	it("is stable for the same content", async () => {
		expect(await gridId('{"a":1}')).toBe(await gridId('{"a":1}'));
	});

	it("differs for different content", async () => {
		expect(await gridId('{"a":1}')).not.toBe(await gridId('{"a":2}'));
	});

	it("matches the route pattern", async () => {
		expect(await gridId("anything")).toMatch(GRID_ID_PATTERN);
	});
});
