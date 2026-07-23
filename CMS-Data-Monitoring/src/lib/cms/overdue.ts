import { asNumber, asString, truthy } from "@/lib/dax";
import { buildSwissHeldSet, lastInTeam, splitCamel } from "./utils";
import {
    addDays,
    daysBetween,
    enumeratePeriods,
    enumeratePeriodsBackward,
    maxDate,
    minDate,
    parseISODate,
    periodEndAfter,
    periodEndAtOrBefore,
    periodEndOf,
    stepPeriod,
    toISODate,
    todayUTC,
    type Cadence,
} from "./period-math";

const DEFAULT_MONTHLY_DELAY_DAYS = 30;
const DEFAULT_QUARTERLY_DELAY_DAYS = 45;

const LOOKBACK = 12;
const PERIODIC_EVENTS = new Set(["Periodic", "Add On"]);
const AT_CLOSE_EVENTS = new Set(["At Close", "Legacy At Close"]);
const NOT_APPROVED_EVENTS = new Set(["Periodic", "Add On", "At Close"]);

export interface OverduePeriodItem {
    period: string;
    days: number;
}

export interface DealEntry {
    dealSrmId: string;
    deal: string;
    realized: boolean;
    comment: string | null;
    euInvested: boolean;
    excluded: boolean;
    troubledCredit: boolean;
    swissHeld: boolean;
    periods: OverduePeriodItem[];
    maxDays: number;
}

export interface PersonGroup {
    person: string;
    deals: DealEntry[];
    maxDays: number;
    periodCount: number;
}

export interface NoFinancialsDeal {
    dealSrmId: string;
    deal: string;
    person: string;
    lastExpectedFinancialsDate: string | null;
    comment: string | null;
    excluded: boolean;
    troubledCredit: boolean;
    swissHeld: boolean;
}

export interface StatusRow {
    deal: string;
    periods: string;
    loadingStatus: "Not Loaded" | "Not Approved" | "No Financials";
    responsible: string;
    realizedStatus: string;
    excluded: boolean;
    troubledCredit: boolean;
    swissHeld: boolean;
}

export interface OverdueAlert {
    deal: string;
    person: string;
    comment: string;
}

export interface OverdueResult {
    notLoaded: PersonGroup[];
    notApproved: PersonGroup[];
    noFinancials: NoFinancialsDeal[];
    statusRows: StatusRow[];
    alerts: OverdueAlert[];
    totalDealsOverdue: number;
    notLoadedPeriods: number;
    notApprovedPeriods: number;
    maxDaysOverdue: number;
}

interface RosterRow {
    dealSrmId: string;
    entityId: string;
    entityName: string;
    realizedStatus: string;
    exclude: boolean;
    lastExpectedFinancialsDate: string | null;
    monthlyDelayDays: number;
    quarterlyDelayDays: number;
    professionals: string[];
    dealTeam: string;
    comment: string | null;
    euInvested: boolean;
    troubledCredit: boolean;
}

/** A loaded-financials period row from vw_financials_ApprovedUnapproved, keyed by EntityId (this view carries no DealSrmId). */
interface PeriodRow {
    entityId: string;
    event: string;
    periodType: string;
    asOfDate: string;
}

interface ResolvedPeriodRow extends PeriodRow {
    dealSrmId: string;
}

function parseRoster(rows: Record<string, unknown>[]): RosterRow[] {
    return rows.map((r) => ({
        dealSrmId: asString(r.DealSrmId),
        entityId: asString(r.EntityId),
        entityName: asString(r.EntityName),
        realizedStatus: asString(r.RealizedUnrealizedStatus),
        exclude: truthy(r.ExcludeFromReporting),
        lastExpectedFinancialsDate: asString(r.LastExpectedFinancialsDate) || null,
        monthlyDelayDays: asNumber(r.MonthlyDelayDays) ?? 0,
        quarterlyDelayDays: asNumber(r.QuarterlyDelayDays) ?? 0,
        professionals: [1, 2, 3, 4, 5, 6]
            .map((n) => asString(r[`DealProfessional${n}`]))
            .filter((v) => v.trim().length > 0),
        dealTeam: asString(r.DealTeam),
        comment: asString(r.Comment) || null,
        euInvested: truthy(r.EUInvested),
        troubledCredit: truthy(r.TroubledCredit),
    }));
}

/**
 * ExcludeFromReporting no longer disqualifies a deal — excluded deals are
 * still reconciled and shown, just flagged with an "Excluded" badge in the
 * UI, per the requirement to surface them rather than silently drop them.
 */
function isReportable(d: RosterRow): boolean {
    if (d.realizedStatus === "Unrealized") return true;
    if (d.realizedStatus === "Realized" && d.lastExpectedFinancialsDate) return true;
    return false;
}

function parsePeriodRows(rows: Record<string, unknown>[]): PeriodRow[] {
    return rows
        .map((r) => ({
            entityId: asString(r.EntityId),
            event: asString(r.Event),
            periodType: asString(r.PeriodType),
            asOfDate: asString(r.AsOfDate),
        }))
        .filter((r) => r.entityId && r.asOfDate);
}

/**
 * vw_financials_ApprovedUnapproved carries no DealSrmId column, so rows must
 * be resolved to a deal via EntityId (DealBlotter's EntityId is unique and
 * verified to cover 100% of this view's EntityIds). Rows that don't match
 * the roster are dropped rather than guessed.
 */
function buildEntityIdToDealSrmId(roster: RosterRow[]): Map<string, string> {
    const m = new Map<string, string>();
    for (const deal of roster) {
        if (deal.entityId) m.set(deal.entityId, deal.dealSrmId);
    }
    return m;
}

/**
 * Resolves rows to a deal via EntityId. `knownEntityIds` is the full
 * (unfiltered) roster's EntityId set — a row whose EntityId belongs to a
 * non-reportable deal (realized with no LastExpectedFinancialsDate; excluded
 * deals ARE reportable now, just badged) is expected to drop silently. Only
 * EntityIds absent from the roster entirely are counted as `unmatched` and
 * worth surfacing.
 */
function resolveToDealSrmId(
    rows: PeriodRow[],
    entityIdToDealSrmId: Map<string, string>,
    knownEntityIds: Set<string>,
): { resolved: ResolvedPeriodRow[]; unmatched: number } {
    const resolved: ResolvedPeriodRow[] = [];
    let unmatched = 0;
    for (const r of rows) {
        const dealSrmId = entityIdToDealSrmId.get(r.entityId);
        if (!dealSrmId) {
            if (!knownEntityIds.has(r.entityId)) unmatched++;
            continue;
        }
        resolved.push({ ...r, dealSrmId });
    }
    return { resolved, unmatched };
}

function parseLatestApprover(
    rows: Record<string, unknown>[],
    entityIdToDealSrmId: Map<string, string>,
): Map<string, string> {
    const m = new Map<string, string>();
    for (const r of rows) {
        const dealSrmId = entityIdToDealSrmId.get(asString(r.EntityId));
        const approver = asString(r.LatestApprover);
        if (dealSrmId && approver) m.set(dealSrmId, splitCamel(approver));
    }
    return m;
}

function groupByDeal<T extends { dealSrmId: string }>(rows: T[]): Map<string, T[]> {
    const m = new Map<string, T[]>();
    for (const r of rows) {
        if (!m.has(r.dealSrmId)) m.set(r.dealSrmId, []);
        m.get(r.dealSrmId)!.push(r);
    }
    return m;
}

/** Cadence = PeriodType of the most recently loaded-and-approved period; falls back to the most recently loaded (unapproved) period if the deal has never had an approved period. */
function detectCadence(approvedRows: ResolvedPeriodRow[], unapprovedRows: ResolvedPeriodRow[]): Cadence | null {
    const source = approvedRows.length > 0 ? approvedRows : unapprovedRows;
    if (source.length === 0) return null;
    let latest = source[0];
    for (const r of source) {
        if (r.asOfDate > latest.asOfDate) latest = r;
    }
    if (latest.periodType === "Monthly") return "Monthly";
    if (latest.periodType === "Quarterly") return "Quarterly";
    return null;
}

/** MonthlyDelayDays/QuarterlyDelayDays of 0 (explicit or blank) default to 30/45 respectively. */
function effectiveDelay(cadence: Cadence, deal: RosterRow): number {
    if (cadence === "Monthly") return deal.monthlyDelayDays > 0 ? deal.monthlyDelayDays : DEFAULT_MONTHLY_DELAY_DAYS;
    return deal.quarterlyDelayDays > 0 ? deal.quarterlyDelayDays : DEFAULT_QUARTERLY_DELAY_DAYS;
}

/**
 * Finds where the deal's *current* cadence began, by walking its loaded
 * periods (approved + unapproved) backward from the most recent date and
 * stopping at the first PeriodType that differs from `currentCadence`.
 * A deal that has always reported on one cadence returns its earliest
 * period as `regimeStart`, `oldCadence: null` (no split needed) — this is
 * PeriodType-driven, so it does not re-introduce the mislabeled-PeriodType
 * failure mode fixed by switching to vw_financials_ApprovedUnapproved.
 *
 * At-Close/Legacy At-Close rows are excluded from this walk — At-Close is a
 * one-time snapshot, not a recurring filing, and its PeriodType tag has been
 * observed not to reflect the deal's actual recurring cadence (e.g. a
 * quarterly-reporting deal's At-Close row tagged "Monthly"), which would
 * otherwise register as a spurious cadence change.
 *
 * `oldSegmentEnd` is the actual last date the old cadence was seen (a real
 * data point, so it's already aligned to the old cadence's grid) — NOT
 * derived by stepping `regimeStart` backward, since `regimeStart` is aligned
 * to the *new* cadence and may not fall on the old cadence's grid at all
 * (e.g. a Monthly regimeStart of Jan-31 is not a quarter-end).
 */
function findCadenceRegimeStart(
    rows: ResolvedPeriodRow[],
    currentCadence: Cadence,
): { regimeStart: Date; oldCadence: Cadence | null; oldSegmentEnd: Date | null } {
    const byDate = new Map<string, string>();
    for (const r of rows) {
        if (AT_CLOSE_EVENTS.has(r.event)) continue;
        byDate.set(r.asOfDate, r.periodType);
    }
    const dates = [...byDate.keys()].sort().reverse();
    if (dates.length === 0) {
        // Only an At-Close row exists so far (no periodic filings yet) — nothing to split.
        return { regimeStart: new Date(0), oldCadence: null, oldSegmentEnd: null };
    }

    let regimeStart = parseISODate(dates[0])!;
    let oldCadence: Cadence | null = null;
    let oldSegmentEnd: Date | null = null;
    for (const dateStr of dates) {
        const periodType = byDate.get(dateStr);
        if (periodType === currentCadence) {
            regimeStart = parseISODate(dateStr)!;
        } else {
            oldCadence = periodType === "Monthly" ? "Monthly" : periodType === "Quarterly" ? "Quarterly" : null;
            oldSegmentEnd = parseISODate(dateStr);
            break;
        }
    }
    return { regimeStart, oldCadence, oldSegmentEnd };
}

function earliestDate(dates: Date[]): Date | null {
    if (dates.length === 0) return null;
    return dates.reduce((min, d) => (d.getTime() < min.getTime() ? d : min), dates[0]);
}

function lastNonEmpty(values: string[]): string | null {
    return values.length > 0 ? values[values.length - 1] : null;
}

function secondLastNonEmpty(values: string[]): string | null {
    return values.length >= 2 ? values[values.length - 2] : null;
}

function addDealToGroup(
    map: Map<string, Map<string, DealEntry>>,
    person: string,
    deal: RosterRow,
    periods: OverduePeriodItem[],
    swissHeldSet: Set<string>,
) {
    if (!map.has(person)) map.set(person, new Map());
    const deals = map.get(person)!;
    if (!deals.has(deal.dealSrmId)) {
        deals.set(deal.dealSrmId, {
            dealSrmId: deal.dealSrmId,
            deal: deal.entityName,
            realized: deal.realizedStatus === "Realized",
            comment: deal.comment,
            euInvested: deal.euInvested,
            excluded: deal.exclude,
            troubledCredit: deal.troubledCredit,
            swissHeld: swissHeldSet.has(deal.dealSrmId),
            periods: [],
            maxDays: 0,
        });
    }
    const entry = deals.get(deal.dealSrmId)!;
    for (const p of periods) {
        if (!entry.periods.some((x) => x.period === p.period)) entry.periods.push(p);
    }
    entry.maxDays = Math.max(entry.maxDays, ...periods.map((p) => p.days));
}

function finalizeGroups(map: Map<string, Map<string, DealEntry>>): PersonGroup[] {
    const groups: PersonGroup[] = [];
    for (const [person, deals] of map) {
        const dealList = [...deals.values()].map((d) => ({
            ...d,
            periods: [...d.periods].sort((a, b) => a.period.localeCompare(b.period)),
        }));
        dealList.sort((a, b) => b.maxDays - a.maxDays);
        groups.push({
            person,
            deals: dealList,
            maxDays: Math.max(0, ...dealList.map((d) => d.maxDays)),
            periodCount: dealList.reduce((s, d) => s + d.periods.length, 0),
        });
    }
    groups.sort((a, b) => b.maxDays - a.maxDays);
    return groups;
}

/**
 * Reconciles the deal roster (DealBlotter) against loaded financials
 * (vw_financials_ApprovedUnapproved, split into approved-present rows via
 * Approved="1" and unapproved rows via Approved<>"1") to compute overdue
 * statements. Joins on DealSrmId except for the financials view, which
 * carries no DealSrmId and must be resolved via EntityId (DealBlotter's
 * EntityId — verified unique and a 100% match against this view).
 * See missing-periods-fs-v3-1 skill for the full algorithm this ports
 * (Sections 2-6).
 */
export function buildOverdue(
    rawRoster: Record<string, unknown>[],
    rawFinPeriods: Record<string, unknown>[],
    rawLatestApprover: Record<string, unknown>[],
    rawUnapproved: Record<string, unknown>[],
    rawPosition: Record<string, unknown>[],
): OverdueResult {
    const today = todayUTC();
    const fullRoster = parseRoster(rawRoster);
    const roster = fullRoster.filter(isReportable);
    const entityIdToDealSrmId = buildEntityIdToDealSrmId(roster);
    const knownEntityIds = new Set(fullRoster.map((d) => d.entityId).filter(Boolean));
    const swissHeldSet = buildSwissHeldSet(rawPosition);

    const { resolved: finPeriods, unmatched: finUnmatched } = resolveToDealSrmId(
        parsePeriodRows(rawFinPeriods),
        entityIdToDealSrmId,
        knownEntityIds,
    );
    const { resolved: unapprovedPeriods, unmatched: unapprUnmatched } = resolveToDealSrmId(
        parsePeriodRows(rawUnapproved),
        entityIdToDealSrmId,
        knownEntityIds,
    );
    if (finUnmatched > 0 || unapprUnmatched > 0) {
        console.warn(`[overdue] vw_financials_ApprovedUnapproved: ${finUnmatched} approved + ${unapprUnmatched} row(s) reference an EntityId not found anywhere in DealBlotter and were dropped.`);
    }
    const latestApprover = parseLatestApprover(rawLatestApprover, entityIdToDealSrmId);

    const finByDeal = groupByDeal(finPeriods);
    const unapprByDeal = groupByDeal(unapprovedPeriods);

    const notLoadedByPerson = new Map<string, Map<string, DealEntry>>();
    const notApprovedByPerson = new Map<string, Map<string, DealEntry>>();
    const noFinancials: NoFinancialsDeal[] = [];
    const statusRows: StatusRow[] = [];

    for (const deal of roster) {
        const finRows = finByDeal.get(deal.dealSrmId) ?? [];
        const unapprRows = unapprByDeal.get(deal.dealSrmId) ?? [];
        const person = lastNonEmpty(deal.professionals) || lastInTeam(deal.dealTeam) || "(Unassigned)";

        if (finRows.length === 0 && unapprRows.length === 0) {
            if (deal.realizedStatus === "Unrealized") {
                noFinancials.push({
                    dealSrmId: deal.dealSrmId,
                    deal: deal.entityName,
                    person,
                    lastExpectedFinancialsDate: deal.lastExpectedFinancialsDate,
                    comment: deal.comment,
                    excluded: deal.exclude,
                    troubledCredit: deal.troubledCredit,
                    swissHeld: swissHeldSet.has(deal.dealSrmId),
                });
                statusRows.push({
                    deal: deal.entityName,
                    periods: "—",
                    loadingStatus: "No Financials",
                    responsible: person,
                    realizedStatus: deal.realizedStatus,
                    excluded: deal.exclude,
                    troubledCredit: deal.troubledCredit,
                    swissHeld: swissHeldSet.has(deal.dealSrmId),
                });
            }
            continue;
        }

        const cadence = detectCadence(finRows, unapprRows);
        if (!cadence) continue;

        const delay = effectiveDelay(cadence, deal);
        const { regimeStart, oldCadence, oldSegmentEnd } = findCadenceRegimeStart([...finRows, ...unapprRows], cadence);
        const oldDelay = oldCadence ? effectiveDelay(oldCadence, deal) : null;

        const approvedPresent = new Set<string>();
        let atCloseBaseline: Date | null = null;
        for (const r of finRows) {
            const pe = parseISODate(r.asOfDate);
            if (!pe) continue;
            if (PERIODIC_EVENTS.has(r.event)) approvedPresent.add(toISODate(pe));
            if (AT_CLOSE_EVENTS.has(r.event)) atCloseBaseline = atCloseBaseline ? maxDate(atCloseBaseline, pe) : pe;
        }

        const unapprovedPeriodic = new Set<string>();
        const presentDates: Date[] = [];
        for (const key of approvedPresent) {
            const d = parseISODate(key);
            if (d) presentDates.push(d);
        }
        for (const r of unapprRows) {
            if (!PERIODIC_EVENTS.has(r.event)) continue;
            const pe = parseISODate(r.asOfDate);
            if (!pe) continue;
            unapprovedPeriodic.add(toISODate(pe));
            presentDates.push(pe);
        }

        const dueCutoff = periodEndAtOrBefore(addDays(today, -delay), cadence);
        const anchor = atCloseBaseline ? periodEndAfter(atCloseBaseline, cadence) : earliestDate(presentDates);
        if (!anchor) continue;

        const windowStart = stepPeriod(dueCutoff, cadence, -(LOOKBACK - 1));
        const start = maxDate(anchor, windowStart);
        let end = dueCutoff;
        if (deal.realizedStatus === "Realized" && deal.lastExpectedFinancialsDate) {
            const lastExpected = parseISODate(deal.lastExpectedFinancialsDate);
            if (lastExpected) end = minDate(periodEndOf(lastExpected, cadence), dueCutoff);
        }

        // Split the expected-periods enumeration at the cadence-change boundary (if any) so a
        // deal that genuinely switched cadence mid-window isn't graded against its new cadence
        // for the era it was still on the old one.
        const notLoadedPeriods: OverduePeriodItem[] = [];
        if (oldCadence && oldDelay != null && oldSegmentEnd && start.getTime() < regimeStart.getTime()) {
            const oldPeriods = enumeratePeriodsBackward(oldSegmentEnd, start, oldCadence);
            for (const pe of oldPeriods) {
                const key = toISODate(pe);
                if (approvedPresent.has(key) || unapprovedPeriodic.has(key)) continue;
                const days = daysBetween(today, addDays(pe, oldDelay));
                if (days > 0) notLoadedPeriods.push({ period: key, days });
            }
        }
        const newSegmentStart = oldCadence ? maxDate(start, regimeStart) : start;
        const newPeriods = enumeratePeriods(newSegmentStart, end, cadence);
        for (const pe of newPeriods) {
            const key = toISODate(pe);
            if (approvedPresent.has(key) || unapprovedPeriodic.has(key)) continue;
            const days = daysBetween(today, addDays(pe, delay));
            if (days > 0) notLoadedPeriods.push({ period: key, days });
        }

        const notApprovedPeriods: OverduePeriodItem[] = [];
        for (const r of unapprRows) {
            if (!NOT_APPROVED_EVENTS.has(r.event)) continue;
            const pe = parseISODate(r.asOfDate);
            if (!pe) continue;
            if (pe.getTime() < start.getTime() || pe.getTime() > end.getTime()) continue;
            const periodDelay = oldCadence && oldDelay != null && pe.getTime() < regimeStart.getTime() ? oldDelay : delay;
            const days = daysBetween(today, addDays(pe, periodDelay));
            if (days > 0) notApprovedPeriods.push({ period: toISODate(pe), days });
        }

        if (notLoadedPeriods.length > 0) {
            addDealToGroup(notLoadedByPerson, person, deal, notLoadedPeriods, swissHeldSet);
            statusRows.push({
                deal: deal.entityName,
                periods: notLoadedPeriods.map((p) => p.period).join(", "),
                loadingStatus: "Not Loaded",
                responsible: person,
                realizedStatus: deal.realizedStatus,
                excluded: deal.exclude,
                troubledCredit: deal.troubledCredit,
                swissHeld: swissHeldSet.has(deal.dealSrmId),
            });
        }
        if (notApprovedPeriods.length > 0) {
            const approverPerson = latestApprover.get(deal.dealSrmId) || secondLastNonEmpty(deal.professionals) || person;
            addDealToGroup(notApprovedByPerson, approverPerson, deal, notApprovedPeriods, swissHeldSet);
            statusRows.push({
                deal: deal.entityName,
                periods: notApprovedPeriods.map((p) => p.period).join(", "),
                loadingStatus: "Not Approved",
                responsible: approverPerson,
                realizedStatus: deal.realizedStatus,
                excluded: deal.exclude,
                troubledCredit: deal.troubledCredit,
                swissHeld: swissHeldSet.has(deal.dealSrmId),
            });
        }
    }

    const notLoaded = finalizeGroups(notLoadedByPerson);
    const notApproved = finalizeGroups(notApprovedByPerson);

    const alerts: OverdueAlert[] = [];
    for (const group of [...notLoaded, ...notApproved]) {
        for (const d of group.deals) {
            if (d.comment) alerts.push({ deal: d.deal, person: group.person, comment: d.comment });
        }
    }
    for (const nf of noFinancials) {
        const deal = roster.find((r) => r.dealSrmId === nf.dealSrmId);
        if (deal?.comment) alerts.push({ deal: nf.deal, person: nf.person, comment: deal.comment });
    }

    const allDeals = new Set([...notLoaded, ...notApproved].flatMap((g) => g.deals.map((d) => d.dealSrmId)));
    statusRows.sort((a, b) => a.deal.localeCompare(b.deal));

    return {
        notLoaded,
        notApproved,
        noFinancials,
        statusRows,
        alerts,
        totalDealsOverdue: allDeals.size,
        notLoadedPeriods: notLoaded.reduce((s, g) => s + g.periodCount, 0),
        notApprovedPeriods: notApproved.reduce((s, g) => s + g.periodCount, 0),
        maxDaysOverdue: Math.max(0, ...notLoaded.map((g) => g.maxDays), ...notApproved.map((g) => g.maxDays)),
    };
}
