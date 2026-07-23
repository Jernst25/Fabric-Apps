import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { DealEntry, NoFinancialsDeal, OverdueResult, PersonGroup } from "@/lib/cms/overdue";
import type { QFDealEntry, QFDealView, QFPersonGroup, QuarterlyResult } from "@/lib/cms/quarterly";
import { KpiCard } from "./KpiCard";
import { PersonBarChart } from "./PersonBarChart";
import { FilterPill } from "./FilterPill";
import { FilterRibbon } from "./FilterRibbon";
import { ExecutiveSnapshotBanner } from "./ExecutiveSnapshotBanner";

const REGION_FILTERS = ["All", "DL Europe", "DL US"];
const REALIZED_FILTERS = ["All", "Unrealized", "Realized"] as const;
type RealizedFilter = (typeof REALIZED_FILTERS)[number];

interface SharedFilters {
    regionFilter: string;
    realizedFilter: RealizedFilter;
    criticalOnly: boolean;
    troubledOnly: boolean;
    excludedOnly: boolean;
    swissOnly: boolean;
    minDays: number;
    periodFilter: string;
    search: string;
}

/** Region/Troubled Credit/Excluded/Swiss Held apply everywhere this shape exists (Overdue, Quarterly, and — via companyFlags — Anomaly). */
function matchesCommonFlags(
    d: { troubledCredit: boolean; excluded: boolean; euInvested: boolean; swissHeld: boolean },
    f: SharedFilters,
): boolean {
    if (f.regionFilter === "DL Europe" && !d.euInvested) return false;
    if (f.regionFilter === "DL US" && d.euInvested) return false;
    if (!f.troubledOnly && d.troubledCredit) return false;
    if (!f.excludedOnly && d.excluded) return false;
    if (f.swissOnly && !d.swissHeld) return false;
    return true;
}

/**
 * Realized/Unrealized, Critical/min-days, and Period only apply to Overdue —
 * Quarterly and Anomaly don't track a per-deal days-overdue or period list
 * (Quarterly is single-quarter status only; anomalies aren't deal-day-tracked
 * at all), so those three filters are no-ops for those two domains by design.
 */
function filterOverdue(overdue: OverdueResult, f: SharedFilters): OverdueResult {
    function matchesDeal(d: DealEntry, person: string): boolean {
        if (!matchesCommonFlags(d, f)) return false;
        if (f.realizedFilter === "Unrealized" && d.realized) return false;
        if (f.realizedFilter === "Realized" && !d.realized) return false;
        if (f.criticalOnly && d.maxDays < 120) return false;
        if (d.maxDays < f.minDays) return false;
        if (f.periodFilter !== "All" && !d.periods.some((p) => p.period === f.periodFilter)) return false;
        if (f.search) {
            const q = f.search.toLowerCase();
            if (!d.deal.toLowerCase().includes(q) && !person.toLowerCase().includes(q)) return false;
        }
        return true;
    }

    function filterGroups(groups: PersonGroup[]): PersonGroup[] {
        return groups
            .map((g) => {
                const deals: DealEntry[] = g.deals
                    .filter((d) => matchesDeal(d, g.person))
                    .map((d) => {
                        if (f.periodFilter === "All") return d;
                        const periods = d.periods.filter((p) => p.period === f.periodFilter);
                        return { ...d, periods, maxDays: Math.max(0, ...periods.map((p) => p.days)) };
                    });
                return {
                    ...g,
                    deals,
                    maxDays: Math.max(0, ...deals.map((d) => d.maxDays)),
                    periodCount: deals.reduce((s, d) => s + d.periods.length, 0),
                };
            })
            .filter((g) => g.deals.length > 0);
    }

    const notLoaded = filterGroups(overdue.notLoaded);
    const notApproved = filterGroups(overdue.notApproved);
    // No Financials deals carry no region/period/maxDays data and are always Unrealized —
    // those filters don't apply to them (matching how the Overdue tab itself treats this bucket).
    const noFinancials: NoFinancialsDeal[] = f.periodFilter !== "All" || f.realizedFilter === "Realized" || f.regionFilter !== "All"
        ? []
        : overdue.noFinancials.filter((d) => {
            if (!f.troubledOnly && d.troubledCredit) return false;
            if (!f.excludedOnly && d.excluded) return false;
            if (f.swissOnly && !d.swissHeld) return false;
            if (f.search) {
                const q = f.search.toLowerCase();
                if (!d.deal.toLowerCase().includes(q) && !d.person.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    const allDeals = new Set([...notLoaded, ...notApproved].flatMap((g) => g.deals.map((d) => d.dealSrmId)));

    const alerts = [
        ...[...notLoaded, ...notApproved].flatMap((g) =>
            g.deals.filter((d) => d.comment).map((d) => ({ deal: d.deal, person: g.person, comment: d.comment! })),
        ),
        ...noFinancials.filter((d) => d.comment).map((d) => ({ deal: d.deal, person: d.person, comment: d.comment! })),
    ];

    return {
        notLoaded,
        notApproved,
        noFinancials,
        // StatusRow carries no region data — only Troubled Credit/Excluded/Swiss Held apply here.
        statusRows: overdue.statusRows.filter((r) =>
            (f.troubledOnly || !r.troubledCredit) && (f.excludedOnly || !r.excluded) && (!f.swissOnly || r.swissHeld),
        ),
        alerts,
        totalDealsOverdue: allDeals.size,
        notLoadedPeriods: notLoaded.reduce((s, g) => s + g.periodCount, 0),
        notApprovedPeriods: notApproved.reduce((s, g) => s + g.periodCount, 0),
        maxDaysOverdue: Math.max(0, ...notLoaded.map((g) => g.maxDays), ...notApproved.map((g) => g.maxDays)),
    };
}

function filterQuarterly(quarterly: QuarterlyResult, f: SharedFilters): QuarterlyResult {
    function matchesEntry(d: QFDealEntry, person: string): boolean {
        if (!matchesCommonFlags(d, f)) return false;
        if (f.search) {
            const q = f.search.toLowerCase();
            if (!d.deal.toLowerCase().includes(q) && !person.toLowerCase().includes(q)) return false;
        }
        return true;
    }
    function matchesView(d: QFDealView): boolean {
        if (!matchesCommonFlags(d, f)) return false;
        if (f.search && !d.deal.toLowerCase().includes(f.search.toLowerCase())) return false;
        return true;
    }
    function filterGroups(groups: QFPersonGroup[]): QFPersonGroup[] {
        return groups
            .map((g) => ({ ...g, deals: g.deals.filter((d) => matchesEntry(d, g.person)) }))
            .filter((g) => g.deals.length > 0);
    }

    const deals = quarterly.deals.filter(matchesView);
    return {
        deals,
        notLoaded: filterGroups(quarterly.notLoaded),
        notApproved: filterGroups(quarterly.notApproved),
        dealsInQuarter: deals.length,
        notLoadedCount: deals.filter((d) => d.status === "not_loaded").length,
        notApprovedCount: deals.filter((d) => d.status === "not_approved").length,
        quarterEndDate: quarterly.quarterEndDate,
        funds: quarterly.funds,
    };
}

export function ExecutiveSummaryTab({
    overdue,
    quarterly,
    quarterLabel,
}: {
    overdue: OverdueResult;
    quarterly: QuarterlyResult;
    quarterLabel: string;
}) {
    const [regionFilter, setRegionFilter] = useState("All");
    const [realizedFilter, setRealizedFilter] = useState<RealizedFilter>("All");
    const [criticalOnly, setCriticalOnly] = useState(false);
    const [troubledOnly, setTroubledOnly] = useState(false);
    const [excludedOnly, setExcludedOnly] = useState(false);
    const [swissOnly, setSwissOnly] = useState(false);
    const [minDays, setMinDays] = useState(0);
    const [periodFilter, setPeriodFilter] = useState("All");
    const [search, setSearch] = useState("");

    const filters: SharedFilters = {
        regionFilter, realizedFilter, criticalOnly, troubledOnly, excludedOnly, swissOnly, minDays, periodFilter, search,
    };

    const periodOptions = useMemo(() => {
        const dates = new Set<string>();
        for (const g of [...overdue.notLoaded, ...overdue.notApproved]) {
            for (const d of g.deals) {
                for (const p of d.periods) dates.add(p.period);
            }
        }
        return [...dates].sort();
    }, [overdue]);

    const filteredOverdue = useMemo(() => filterOverdue(overdue, filters), [overdue, filters]);
    const filteredQuarterly = useMemo(() => filterQuarterly(quarterly, filters), [quarterly, filters]);

    const periodLabel = useMemo(() => {
        if (periodFilter === "All") return null;
        const [year, month, day] = periodFilter.split("-");
        return `${Number(month)}/${Number(day)}/${year}`;
    }, [periodFilter]);

    const overdueNotLoadedChart = filteredOverdue.notLoaded.map((g) => ({
        person: g.person,
        count: g.deals.length,
        deals: g.deals.map((d) => d.deal),
    }));
    const overdueNotApprovedChart = filteredOverdue.notApproved.map((g) => ({
        person: g.person,
        count: g.deals.length,
        deals: g.deals.map((d) => d.deal),
    }));

    return (
        <div className="space-y-l">
            <FilterRibbon>
                {REGION_FILTERS.map((f) => (
                    <FilterPill key={f} active={regionFilter === f} onClick={() => setRegionFilter(f)}>
                        {f}
                    </FilterPill>
                ))}
                <span className="w-px self-stretch bg-border" aria-hidden="true" />
                {REALIZED_FILTERS.map((f) => (
                    <FilterPill key={f} active={realizedFilter === f} onClick={() => setRealizedFilter(f)}>
                        {f}
                    </FilterPill>
                ))}
                <span className="w-px self-stretch bg-border" aria-hidden="true" />
                <FilterPill active={criticalOnly} onClick={() => setCriticalOnly((v) => !v)}>Critical ≥120d</FilterPill>
                <FilterPill active={troubledOnly} onClick={() => setTroubledOnly((v) => !v)}>Troubled Credit</FilterPill>
                <FilterPill active={excludedOnly} onClick={() => setExcludedOnly((v) => !v)}>Excluded</FilterPill>
                <FilterPill active={swissOnly} onClick={() => setSwissOnly((v) => !v)}>Swiss Held</FilterPill>
                <select
                    value={minDays}
                    onChange={(e) => setMinDays(Number(e.target.value))}
                    className="rounded-sm border border-input bg-card px-m py-xs text-200"
                >
                    {[0, 15, 30, 50, 60, 90, 120].map((d) => (
                        <option key={d} value={d}>{d === 0 ? "Any days" : `≥ ${d} days`}</option>
                    ))}
                </select>
                <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className="rounded-sm border border-input bg-card px-m py-xs text-200"
                >
                    <option value="All">All Periods</option>
                    {periodOptions.map((p) => {
                        const [year, month, day] = p.split("-");
                        return <option key={p} value={p}>{`${Number(month)}/${Number(day)}/${year}`}</option>;
                    })}
                </select>
                <div className="relative ml-auto">
                    <Search className="icon-size-100 absolute left-s top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search person, deal, or company…"
                        className="rounded-sm border border-input bg-card pl-[28px] pr-m py-xs text-200 min-w-[220px]"
                    />
                </div>
            </FilterRibbon>

            <ExecutiveSnapshotBanner
                overdue={filteredOverdue}
                quarterly={filteredQuarterly}
                quarterLabel={quarterLabel}
                periodLabel={periodLabel}
            />

            <div>
                <h3 className="text-400 font-semibold mb-m">Overdue CMS Financials</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-m">
                    <KpiCard label="Deals Impacted" value={filteredOverdue.totalDealsOverdue} />
                    <KpiCard label="Periods Not Loaded" value={filteredOverdue.notLoadedPeriods} accent="medium" />
                    <KpiCard label="Periods Not Approved" value={filteredOverdue.notApprovedPeriods} accent="high" />
                    <KpiCard label="Max Days Overdue" value={filteredOverdue.maxDaysOverdue} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-m">
                {overdueNotLoadedChart.length > 0 && <PersonBarChart title="Overdue: Not Loaded by associate" data={overdueNotLoadedChart} />}
                {overdueNotApprovedChart.length > 0 && <PersonBarChart title="Overdue: Not Approved by approver" data={overdueNotApprovedChart} />}
            </div>
        </div>
    );
}
