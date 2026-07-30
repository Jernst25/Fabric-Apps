import { useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Mail, Search } from "lucide-react";
import type { DealEntry, OverdueResult, PersonGroup, StatusRow } from "@/lib/cms/overdue";
import { cmsUrl } from "@/lib/cms/utils";
import type { EmailInput } from "@/lib/cms/email";
import { KpiCard } from "./KpiCard";
import { CollapsibleGroup } from "./CollapsibleGroup";
import { GroupList } from "./GroupList";
import { DaysBar } from "./DaysBar";
import { FilterPill } from "./FilterPill";
import { FilterRibbon } from "./FilterRibbon";
import { EmailModal } from "./EmailModal";
import { NoFinancialsTable } from "./NoFinancialsTable";
import { StatusTable } from "./StatusTable";
import { EmptyState } from "./DataStates";
import { cn } from "@/lib/utils";

const REGION_FILTERS = ["All", "DL Europe", "DL US"];
const REALIZED_FILTERS = ["All", "Unrealized", "Realized"] as const;
type RealizedFilter = (typeof REALIZED_FILTERS)[number];

/** `period` is a plain "YYYY-MM-DD" string — format without going through Date/timezone parsing. */
function formatPeriodLabel(period: string): string {
    const [year, month, day] = period.split("-");
    return `${Number(month)}/${Number(day)}/${year}`;
}

interface QueueEntry {
    person: string;
    status: "Not Loaded" | "Not Approved";
    deals: DealEntry[];
}

function DealRow({ deal }: { deal: DealEntry }) {
    return (
        <div className="flex items-center gap-m px-l py-xs pl-[64px] text-100">
            <div className="flex items-center gap-s flex-1 min-w-0">
                <a
                    href={cmsUrl(deal.deal)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline inline-flex items-center gap-xs min-w-0 truncate"
                >
                    {deal.deal}
                    <ExternalLink className="icon-size-100 shrink-0" />
                </a>
                {deal.realized && (
                    <span className="text-100 rounded bg-muted px-s py-xxs font-medium whitespace-nowrap">REALIZED</span>
                )}
                {deal.excluded && (
                    <span className="text-100 rounded bg-[color:var(--color-sev-high-bg)] text-[color:var(--color-sev-high)] px-s py-xxs font-medium whitespace-nowrap">
                        EXCLUDED
                    </span>
                )}
                {deal.troubledCredit && (
                    <span className="text-100 rounded bg-[color:var(--color-sev-medium-bg)] text-[color:var(--color-sev-medium)] px-s py-xxs font-medium whitespace-nowrap">
                        TROUBLED CREDIT
                    </span>
                )}
                {deal.swissHeld && (
                    <span className="text-100 rounded bg-muted text-muted-foreground px-s py-xxs font-medium whitespace-nowrap">
                        SWISS HELD
                    </span>
                )}
                {deal.comment && (
                    <span
                        title={deal.comment}
                        aria-label={`Blotter comment: ${deal.comment}`}
                        className="icon-size-100 rounded-full bg-accent shrink-0 cursor-help"
                    />
                )}
                <span className="text-100 text-muted-foreground whitespace-nowrap">{deal.dealSrmId}</span>
            </div>
            <div className="flex gap-xs flex-wrap justify-end">
                {deal.periods.map((p) => (
                    <span
                        key={p.period}
                        title={`${p.days}d overdue`}
                        className={cn(
                            "text-100 rounded px-s py-xxs font-medium whitespace-nowrap",
                            p.days >= 50
                                ? "bg-[color:var(--color-status-not-approved-bg)] text-[color:var(--color-status-not-approved)]"
                                : "bg-muted text-muted-foreground",
                        )}
                    >
                        {p.period}
                    </span>
                ))}
            </div>
        </div>
    );
}

function Section({
    title,
    dotColor,
    groups,
    onEmail,
}: {
    title: string;
    dotColor: string;
    groups: PersonGroup[];
    onEmail: (person: string, deals: DealEntry[]) => void;
}) {
    if (groups.length === 0) return null;
    const periodCount = groups.reduce((s, g) => s + g.periodCount, 0);
    return (
        <GroupList title={title} dotColor={dotColor} badge={`${groups.length} people · ${periodCount} periods`}>
            {groups.map((g) => (
                <CollapsibleGroup
                    key={g.person}
                    person={g.person}
                    subtitle={`${g.deals.length} deal${g.deals.length === 1 ? "" : "s"} outstanding`}
                    stat={<DaysBar days={g.maxDays} maxDays={Math.max(...groups.map((x) => x.maxDays), 1)} />}
                    onEmail={() => onEmail(g.person, g.deals)}
                    defaultOpen
                >
                    {g.deals.map((d) => (
                        <DealRow key={d.dealSrmId} deal={d} />
                    ))}
                </CollapsibleGroup>
            ))}
        </GroupList>
    );
}

export function OverdueTab({ data }: { data: OverdueResult }) {
    const [regionFilter, setRegionFilter] = useState("All");
    const [realizedFilter, setRealizedFilter] = useState<RealizedFilter>("All");
    const [criticalOnly, setCriticalOnly] = useState(false);
    const [troubledOnly, setTroubledOnly] = useState(false);
    const [excludedOnly, setExcludedOnly] = useState(false);
    const [swissOnly, setSwissOnly] = useState(false);
    const [minDays, setMinDays] = useState(0);
    const [periodFilter, setPeriodFilter] = useState("All");
    const [search, setSearch] = useState("");
    const [isolate, setIsolate] = useState<"none" | "notLoaded" | "notApproved" | "noFinancials">("none");
    const [emailInput, setEmailInput] = useState<EmailInput | null>(null);
    const [queue, setQueue] = useState<{ items: QueueEntry[]; index: number } | null>(null);

    const periodOptions = useMemo(() => {
        const dates = new Set<string>();
        for (const g of [...data.notLoaded, ...data.notApproved]) {
            for (const d of g.deals) {
                for (const p of d.periods) dates.add(p.period);
            }
        }
        return [...dates].sort();
    }, [data]);

    const filterGroups = useMemo(() => {
        return (groups: PersonGroup[]): PersonGroup[] =>
            groups
                .map((g) => {
                    const deals = g.deals
                        .filter((d) => {
                            if (regionFilter === "DL Europe" && !d.euInvested) return false;
                            if (regionFilter === "DL US" && d.euInvested) return false;
                            if (realizedFilter === "Unrealized" && d.realized) return false;
                            if (realizedFilter === "Realized" && !d.realized) return false;
                            if (criticalOnly && d.maxDays < 120) return false;
                            // Troubled Credit deals are always included by default — the pill
                            // excludes them when turned on. Excluded is the opposite: an opt-in
                            // inclusion gate, hidden unless its pill is turned on.
                            if (troubledOnly && d.troubledCredit) return false;
                            if (!excludedOnly && d.excluded) return false;
                            if (swissOnly && !d.swissHeld) return false;
                            if (d.maxDays < minDays) return false;
                            if (periodFilter !== "All" && !d.periods.some((p) => p.period === periodFilter)) return false;
                            if (search) {
                                const q = search.toLowerCase();
                                if (!d.deal.toLowerCase().includes(q) && !g.person.toLowerCase().includes(q)) return false;
                            }
                            return true;
                        })
                        .map((d) => {
                            if (periodFilter === "All") return d;
                            // Narrow to just the selected period so the pills/max-days reflect it specifically.
                            const periods = d.periods.filter((p) => p.period === periodFilter);
                            return { ...d, periods, maxDays: Math.max(0, ...periods.map((p) => p.days)) };
                        });
                    return {
                        ...g,
                        deals,
                        // Recompute from the filtered deals — the precomputed maxDays/periodCount
                        // reflect this person's full (unfiltered) deal list otherwise.
                        maxDays: Math.max(0, ...deals.map((d) => d.maxDays)),
                        periodCount: deals.reduce((s, d) => s + d.periods.length, 0),
                    };
                })
                .filter((g) => g.deals.length > 0);
    }, [regionFilter, realizedFilter, criticalOnly, troubledOnly, excludedOnly, swissOnly, minDays, periodFilter, search]);

    const notLoaded = useMemo(
        () => (isolate === "notApproved" || isolate === "noFinancials" ? [] : filterGroups(data.notLoaded)),
        [data, filterGroups, isolate],
    );
    const notApproved = useMemo(
        () => (isolate === "notLoaded" || isolate === "noFinancials" ? [] : filterGroups(data.notApproved)),
        [data, filterGroups, isolate],
    );
    const noFinancials = useMemo(() => {
        if (isolate === "notLoaded" || isolate === "notApproved") return [];
        if (realizedFilter === "Realized") return []; // No Financials deals are always Unrealized
        if (periodFilter !== "All") return []; // No Financials deals aren't tied to a specific period
        return data.noFinancials.filter((d) => {
            if (troubledOnly && d.troubledCredit) return false;
            if (!excludedOnly && d.excluded) return false;
            if (swissOnly && !d.swissHeld) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!d.deal.toLowerCase().includes(q) && !d.person.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [data, isolate, search, realizedFilter, periodFilter, troubledOnly, excludedOnly, swissOnly]);

    const dealsImpactedShown = new Set([...notLoaded, ...notApproved].flatMap((g) => g.deals.map((d) => d.dealSrmId))).size;
    const dealsShown = dealsImpactedShown + noFinancials.length;

    const maxDaysOverdueShown = Math.max(
        0,
        ...notLoaded.map((g) => g.maxDays),
        ...notApproved.map((g) => g.maxDays),
    );

    // Recomputed from the filtered notLoaded/notApproved lists — data.notLoadedPeriods etc.
    // reflect the full unfiltered dataset and would otherwise ignore every filter above.
    const notLoadedPeriodsShown = notLoaded.reduce((s, g) => s + g.periodCount, 0);
    const notApprovedPeriodsShown = notApproved.reduce((s, g) => s + g.periodCount, 0);

    // Recomputed from the filtered notLoaded/notApproved/noFinancials lists — data.alerts is
    // built once from the full unfiltered dataset and would otherwise ignore every filter above.
    const alertsShown = useMemo(() => {
        const alerts: { deal: string; person: string; comment: string }[] = [];
        for (const g of [...notLoaded, ...notApproved]) {
            for (const d of g.deals) {
                if (d.comment) alerts.push({ deal: d.deal, person: g.person, comment: d.comment });
            }
        }
        for (const nf of noFinancials) {
            if (nf.comment) alerts.push({ deal: nf.deal, person: nf.person, comment: nf.comment });
        }
        return alerts;
    }, [notLoaded, notApproved, noFinancials]);

    // Recomputed from the filtered notLoaded/notApproved/noFinancials lists — data.statusRows
    // is built once from the full unfiltered dataset and would otherwise ignore every filter.
    const statusRowsShown = useMemo(() => {
        const rows: StatusRow[] = [];
        for (const g of notLoaded) {
            for (const d of g.deals) {
                rows.push({
                    deal: d.deal,
                    periods: d.periods.map((p) => p.period).join(", "),
                    loadingStatus: "Not Loaded",
                    responsible: g.person,
                    realizedStatus: d.realized ? "Realized" : "Unrealized",
                    excluded: d.excluded,
                    troubledCredit: d.troubledCredit,
                    swissHeld: d.swissHeld,
                });
            }
        }
        for (const g of notApproved) {
            for (const d of g.deals) {
                rows.push({
                    deal: d.deal,
                    periods: d.periods.map((p) => p.period).join(", "),
                    loadingStatus: "Not Approved",
                    responsible: g.person,
                    realizedStatus: d.realized ? "Realized" : "Unrealized",
                    excluded: d.excluded,
                    troubledCredit: d.troubledCredit,
                    swissHeld: d.swissHeld,
                });
            }
        }
        for (const nf of noFinancials) {
            rows.push({
                deal: nf.deal,
                periods: "—",
                loadingStatus: "No Financials",
                responsible: nf.person,
                realizedStatus: "Unrealized",
                excluded: nf.excluded,
                troubledCredit: nf.troubledCredit,
                swissHeld: nf.swissHeld,
            });
        }
        return rows.sort((a, b) => a.deal.localeCompare(b.deal));
    }, [notLoaded, notApproved, noFinancials]);

    function openEmail(person: string, status: "Not Loaded" | "Not Approved", deals: DealEntry[]) {
        setEmailInput({
            person,
            status,
            deals: deals.map((d) => ({
                deal: d.deal,
                detail: `${d.periods.map((p) => p.period).join(", ")} (${d.maxDays}d overdue)`,
            })),
        });
    }

    function startBulkFollowUps() {
        const items: QueueEntry[] = [
            ...notLoaded.map((g) => ({ person: g.person, status: "Not Loaded" as const, deals: g.deals })),
            ...notApproved.map((g) => ({ person: g.person, status: "Not Approved" as const, deals: g.deals })),
        ];
        if (items.length === 0) return;
        setQueue({ items, index: 0 });
        openEmail(items[0].person, items[0].status, items[0].deals);
    }

    function advanceQueue() {
        if (!queue) return;
        const nextIndex = queue.index + 1;
        if (nextIndex >= queue.items.length) {
            setQueue(null);
            setEmailInput(null);
            return;
        }
        setQueue({ ...queue, index: nextIndex });
        const next = queue.items[nextIndex];
        openEmail(next.person, next.status, next.deals);
    }

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
                <FilterPill active={criticalOnly} onClick={() => setCriticalOnly((c) => !c)}>Critical ≥120d</FilterPill>
                <FilterPill active={troubledOnly} onClick={() => setTroubledOnly((v) => !v)}>Troubled Credit</FilterPill>
                <FilterPill active={excludedOnly} onClick={() => setExcludedOnly((v) => !v)}>Excluded</FilterPill>
                <FilterPill active={swissOnly} onClick={() => setSwissOnly((v) => !v)}>Swiss Held</FilterPill>
                <FilterPill active={isolate === "noFinancials"} onClick={() => setIsolate((v) => (v === "noFinancials" ? "none" : "noFinancials"))}>
                    No Financials
                </FilterPill>
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
                    {periodOptions.map((p) => (
                        <option key={p} value={p}>{formatPeriodLabel(p)}</option>
                    ))}
                </select>
                <button
                    onClick={startBulkFollowUps}
                    className="inline-flex items-center gap-xs rounded-sm bg-primary text-primary-foreground px-m py-xs text-200 font-semibold hover:opacity-90"
                >
                    <Mail className="icon-size-100" /> Bulk follow-ups
                </button>
                <div className="ml-auto flex items-center gap-m">
                    <div className="relative">
                        <Search className="icon-size-100 absolute left-s top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search person or deal…"
                            className="rounded-sm border border-input bg-card pl-[28px] pr-m py-xs text-200 min-w-[220px]"
                        />
                    </div>
                    <span className="text-200 text-muted-foreground whitespace-nowrap">{dealsShown} deals shown</span>
                </div>
            </FilterRibbon>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-m">
                <KpiCard label="Deals Impacted" value={dealsImpactedShown} subtext={`+ ${noFinancials.length} with no financials`} />
                <KpiCard
                    label="Periods Not Loaded"
                    value={notLoadedPeriodsShown}
                    accent="medium"
                    subtext="click to isolate"
                    onClick={() => setIsolate((v) => (v === "notLoaded" ? "none" : "notLoaded"))}
                />
                <KpiCard
                    label="Periods Not Approved"
                    value={notApprovedPeriodsShown}
                    accent="high"
                    subtext="click to isolate"
                    onClick={() => setIsolate((v) => (v === "notApproved" ? "none" : "notApproved"))}
                />
                <KpiCard label="Max Days Overdue" value={maxDaysOverdueShown} subtext="oldest outstanding period" />
            </div>

            {alertsShown.length > 0 && (
                <div className="rounded-sm border border-[color:var(--color-alert)]/30 bg-[color:var(--color-alert-bg)] px-m py-xs space-y-xxs">
                    <div className="flex items-center gap-xs font-semibold text-100 text-[color:var(--color-alert)]">
                        <AlertTriangle className="icon-size-100" />
                        Hold emails — {alertsShown.length} deal{alertsShown.length === 1 ? "" : "s"} with active blotter comments
                    </div>
                    <ul className="text-100 space-y-xxs">
                        {alertsShown.map((a, i) => (
                            <li key={i}>
                                <span className="font-medium">{a.deal}</span> ({a.person}): {a.comment}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {notLoaded.length === 0 && notApproved.length === 0 && noFinancials.length === 0 ? (
                <EmptyState message="No overdue deals match the current filters." />
            ) : (
                <>
                    <Section
                        title="Not Loaded — statements missing from CMS"
                        dotColor="var(--color-status-not-loaded)"
                        groups={notLoaded}
                        onEmail={(person, deals) => openEmail(person, "Not Loaded", deals)}
                    />
                    <Section
                        title="Not Approved — awaiting approval"
                        dotColor="var(--color-status-not-approved)"
                        groups={notApproved}
                        onEmail={(person, deals) => openEmail(person, "Not Approved", deals)}
                    />
                    <NoFinancialsTable deals={noFinancials} />
                </>
            )}

            <StatusTable rows={statusRowsShown} />

            {emailInput && (
                <EmailModal
                    input={emailInput}
                    onClose={() => {
                        setEmailInput(null);
                        setQueue(null);
                    }}
                    queueIndex={queue?.index}
                    queueTotal={queue?.items.length}
                    onNext={queue ? advanceQueue : undefined}
                />
            )}
        </div>
    );
}
