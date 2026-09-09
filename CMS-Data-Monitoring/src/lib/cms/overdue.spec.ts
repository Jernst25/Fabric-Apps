import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOverdue } from "./overdue";

/**
 * buildOverdue reads the wall clock via todayUTC(), so every test here pins the
 * date. 2026-09-09 is the date the At-Exit bug was observed in production
 * against Brooklyn Bedding (INDE02250).
 */
const TODAY = new Date("2026-09-09T00:00:00Z");

/** Column shape matches the aliases in queries/overdue/roster.dax. */
function rosterRow(over: Record<string, unknown> = {}) {
    return {
        DealSrmId: "INDE02250",
        EntityId: "E1",
        EntityName: "Brooklyn Bedding",
        RealizedUnrealizedStatus: "Realized",
        ExcludeFromReporting: "0",
        FirstExpectedFinancialsDate: null,
        LastExpectedFinancialsDate: "2025-09-30T00:00:00",
        MonthlyDelayDays: 30,
        QuarterlyDelayDays: 45,
        DealProfessional1: "Joyce Lu",
        DealTeam: "Joyce Lu",
        Comment: null,
        EUInvested: null,
        TroubledCredit: null,
        ...over,
    };
}

/** Column shape matches queries/overdue/financials-periods.dax. */
function periodRow(asOfDate: string, event = "Periodic", periodType = "Quarterly") {
    return { EntityId: "E1", Event: event, PeriodType: periodType, AsOfDate: `${asOfDate}T00:00:00` };
}

/** The quarters Brooklyn Bedding filed normally, before its exit period. */
const QUARTERS_2023_09_TO_2025_06 = [
    "2023-09-30", "2023-12-31", "2024-03-31", "2024-06-30",
    "2024-09-30", "2024-12-31", "2025-03-31", "2025-06-30",
];

function periodsIn(groups: ReturnType<typeof buildOverdue>["notLoaded"]) {
    return groups.flatMap((g) => g.deals.flatMap((d) => d.periods.map((p) => p.period)));
}

function overduePeriodsFor(approved: Record<string, unknown>[], unapproved: Record<string, unknown>[] = []) {
    return periodsIn(buildOverdue([rosterRow()], approved, [], unapproved, []).notLoaded);
}

function notApprovedPeriodsFor(approved: Record<string, unknown>[], unapproved: Record<string, unknown>[]) {
    return periodsIn(buildOverdue([rosterRow()], approved, [], unapproved, []).notApproved);
}

describe("buildOverdue event handling", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(TODAY);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("treats an At Exit filing as satisfying its period", () => {
        const approved = [
            periodRow("2021-10-31", "At Close", "Monthly"),
            ...QUARTERS_2023_09_TO_2025_06.map((d) => periodRow(d)),
            // The exit filing at exactly LastExpectedFinancialsDate.
            periodRow("2025-09-30", "At Exit"),
        ];

        expect(overduePeriodsFor(approved)).toEqual([]);
    });

    it("reports the exit period as missing when no filing covers it", () => {
        const approved = [
            periodRow("2021-10-31", "At Close", "Monthly"),
            ...QUARTERS_2023_09_TO_2025_06.map((d) => periodRow(d)),
        ];

        expect(overduePeriodsFor(approved)).toEqual(["2025-09-30"]);
    });

    it("flags an unapproved At Exit filing as not approved, not as missing", () => {
        const approved = [
            periodRow("2021-10-31", "At Close", "Monthly"),
            ...QUARTERS_2023_09_TO_2025_06.map((d) => periodRow(d)),
        ];
        const unapproved = [periodRow("2025-09-30", "At Exit")];

        // Present, so not missing; unapproved, so it must surface somewhere.
        expect(overduePeriodsFor(approved, unapproved)).toEqual([]);
        expect(notApprovedPeriodsFor(approved, unapproved)).toEqual(["2025-09-30"]);
    });

    it("does not anchor the expected-period window on a Legacy At Close", () => {
        // Unrealized so nothing caps `end`; monthly so the window is the last 12 months.
        const roster = [rosterRow({ RealizedUnrealizedStatus: "Unrealized", LastExpectedFinancialsDate: null })];
        const approved = [
            periodRow("2025-08-31", "Legacy At Close", "Monthly"),
            // Reporting actually starts here, three months after the legacy close.
            ...["2025-11-30", "2025-12-31", "2026-01-31", "2026-02-28",
                "2026-03-31", "2026-04-30", "2026-05-31", "2026-06-30"]
                .map((d) => periodRow(d, "Periodic", "Monthly")),
        ];

        // Anchoring on the legacy close would expect (and miss) 2025-09-30 and 2025-10-31.
        expect(periodsIn(buildOverdue(roster, approved, [], [], []).notLoaded)).toEqual([]);
    });

    it.each(["Add On", "Add-on"])("ignores %s filings rather than counting them as coverage", (event) => {
        const approved = [
            periodRow("2021-10-31", "At Close", "Monthly"),
            ...QUARTERS_2023_09_TO_2025_06.filter((d) => d !== "2024-09-30").map((d) => periodRow(d)),
            // 2024-09-30's only filing is an add-on, so the quarter stays uncovered.
            periodRow("2024-09-30", event),
            periodRow("2025-09-30", "At Exit"),
        ];

        expect(overduePeriodsFor(approved)).toEqual(["2024-09-30"]);
    });
});
