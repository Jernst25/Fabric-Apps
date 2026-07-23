export type Cadence = "Monthly" | "Quarterly";

/**
 * Parses a date string as a UTC calendar date, ignoring any time-of-day and
 * timezone component. The DAX layer returns AsOfDate as a local-time-looking
 * datetime string (e.g. "2024-03-31T00:00:00") with no real time-of-day
 * meaning — parsing it directly with `new Date()` would apply the browser's
 * local timezone offset and can shift the calendar date by a day.
 */
export function parseISODate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const datePart = iso.slice(0, 10);
    const d = new Date(`${datePart}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export function todayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function lastDayOfMonth(year: number, monthIndex0: number): Date {
    return new Date(Date.UTC(year, monthIndex0 + 1, 0));
}

/** End of the month/quarter containing `d` (may be after `d` itself). */
export function periodEndOf(d: Date, cadence: Cadence): Date {
    if (cadence === "Monthly") return lastDayOfMonth(d.getUTCFullYear(), d.getUTCMonth());
    const quarterStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
    return lastDayOfMonth(d.getUTCFullYear(), quarterStartMonth + 2);
}

/** Steps a period-end date forward (n>0) or backward (n<0) by n periods. */
export function stepPeriod(d: Date, cadence: Cadence, n: number): Date {
    const monthStep = cadence === "Monthly" ? n : n * 3;
    return lastDayOfMonth(d.getUTCFullYear(), d.getUTCMonth() + monthStep);
}

/** The most recent period-end at or before `d`. */
export function periodEndAtOrBefore(d: Date, cadence: Cadence): Date {
    const end = periodEndOf(d, cadence);
    return end.getTime() <= d.getTime() ? end : stepPeriod(end, cadence, -1);
}

/**
 * The next period-end strictly after `d`. Used to anchor "the period
 * immediately after At-Close" — the At-Close date is rarely itself aligned
 * to the cadence's grid (e.g. an At-Close of Nov-30 isn't a quarter-end),
 * so naively stepping it forward by cadence months can land on a date
 * (Feb-28) that will never actually be filed against.
 */
export function periodEndAfter(d: Date, cadence: Cadence): Date {
    const end = periodEndOf(d, cadence);
    return end.getTime() > d.getTime() ? end : stepPeriod(end, cadence, 1);
}

export function addDays(d: Date, days: number): Date {
    return new Date(d.getTime() + days * 86_400_000);
}

export function daysBetween(a: Date, b: Date): number {
    return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function minDate(a: Date, b: Date): Date {
    return a.getTime() <= b.getTime() ? a : b;
}

export function maxDate(a: Date, b: Date): Date {
    return a.getTime() >= b.getTime() ? a : b;
}

/** Enumerates period-end dates from `start` to `end` inclusive, stepping by cadence. Empty if start > end. */
export function enumeratePeriods(start: Date, end: Date, cadence: Cadence): Date[] {
    const out: Date[] = [];
    let cur = start;
    let guard = 0;
    while (cur.getTime() <= end.getTime() && guard < 500) {
        out.push(cur);
        cur = stepPeriod(cur, cadence, 1);
        guard++;
    }
    return out;
}

/**
 * Enumerates period-end dates stepping backward from `from` (inclusive)
 * down to `limit` (inclusive), returned in ascending order. Used to walk a
 * prior-cadence segment back from a known-aligned boundary date, so the
 * caller never needs `limit` itself to fall on that cadence's grid.
 */
export function enumeratePeriodsBackward(from: Date, limit: Date, cadence: Cadence): Date[] {
    const out: Date[] = [];
    let cur = from;
    let guard = 0;
    while (cur.getTime() >= limit.getTime() && guard < 500) {
        out.push(cur);
        cur = stepPeriod(cur, cadence, -1);
        guard++;
    }
    return out.reverse();
}
