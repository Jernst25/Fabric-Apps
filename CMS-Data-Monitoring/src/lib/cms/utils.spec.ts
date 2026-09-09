import { describe, expect, it } from "vitest";
import { isIgnoredEvent } from "./utils";

describe("isIgnoredEvent", () => {
    it.each([
        "Add On",
        "Add-on",
        // Spelling drift the normalised key is meant to absorb.
        "add on",
        "ADD-ON",
        "AddOn",
        "Legacy At Close",
        "legacy at close",
    ])("ignores %s", (event) => {
        expect(isIgnoredEvent(event)).toBe(true);
    });

    it.each([
        "Periodic",
        "At Close",
        "At Exit",
        "",
    ])("keeps %s", (event) => {
        expect(isIgnoredEvent(event)).toBe(false);
    });

    it("does not confuse At Close with Legacy At Close", () => {
        expect(isIgnoredEvent("At Close")).toBe(false);
        expect(isIgnoredEvent("Legacy At Close")).toBe(true);
    });
});
