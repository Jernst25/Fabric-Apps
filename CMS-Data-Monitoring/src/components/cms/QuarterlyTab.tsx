import { useMemo, useState } from "react";
import { ExternalLink, Mail, Search } from "lucide-react";
import { QUARTERS, type QFDealEntry, type QFPersonGroup, type QuarterlyResult } from "@/lib/cms/quarterly";
import { cmsUrl } from "@/lib/cms/utils";
import type { EmailInput } from "@/lib/cms/email";
import { KpiCard } from "./KpiCard";
import { PersonBarChart } from "./PersonBarChart";
import { CollapsibleGroup } from "./CollapsibleGroup";
import { GroupList } from "./GroupList";
import { StatusBadge } from "./StatusBadge";
import { FundPill } from "./FundPill";
import { FilterPill } from "./FilterPill";
import { FilterRibbon } from "./FilterRibbon";
import { EmailModal } from "./EmailModal";
import { EmptyState } from "./DataStates";
import { cn } from "@/lib/utils";

const REGION_FILTERS = ["All", "DL Europe", "DL US"];

interface QueueEntry {
    person: string;
    status: "Not Loaded" | "Not Approved";
    deals: QFDealEntry[];
}

function DealRow({ deal, status }: { deal: QFDealEntry; status: "Not Loaded" | "Not Approved" }) {
    return (
        <div className="flex items-center gap-m px-l py-s pl-[64px] text-300">
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
                {deal.excluded && (
                    <span className="text-200 rounded bg-[color:var(--color-sev-high-bg)] text-[color:var(--color-sev-high)] px-s py-xxs font-medium whitespace-nowrap">
                        EXCLUDED
                    </span>
                )}
                {deal.troubledCredit && (
                    <span className="text-200 rounded bg-[color:var(--color-sev-medium-bg)] text-[color:var(--color-sev-medium)] px-s py-xxs font-medium whitespace-nowrap">
                        TROUBLED CREDIT
                    </span>
                )}
                {deal.swissHeld && (
                    <span className="text-200 rounded bg-muted text-muted-foreground px-s py-xxs font-medium whitespace-nowrap">
                        SWISS HELD
                    </span>
                )}
            </div>
            <div className="flex gap-xs flex-wrap justify-end">
                {deal.funds.map((f) => (
                    <FundPill key={f} fund={f} />
                ))}
            </div>
            <StatusBadge status={status} />
        </div>
    );
}

function Section({
    title,
    dotColor,
    groups,
    status,
    onEmail,
}: {
    title: string;
    dotColor: string;
    groups: QFPersonGroup[];
    status: "Not Loaded" | "Not Approved";
    onEmail: (person: string, deals: QFDealEntry[]) => void;
}) {
    if (groups.length === 0) return null;
    const dealCount = groups.reduce((s, g) => s + g.deals.length, 0);
    return (
        <GroupList title={title} dotColor={dotColor} badge={`${groups.length} people · ${dealCount} deals`}>
            {groups.map((g) => (
                <CollapsibleGroup
                    key={g.person}
                    person={g.person}
                    subtitle={`${g.deals.length} deal${g.deals.length === 1 ? "" : "s"}`}
                    onEmail={() => onEmail(g.person, g.deals)}
                >
                    {g.deals.map((d) => (
                        <DealRow key={d.deal} deal={d} status={status} />
                    ))}
                </CollapsibleGroup>
            ))}
        </GroupList>
    );
}

export function QuarterlyTab({
    data,
    quarterIndex,
    setQuarterIndex,
}: {
    data: QuarterlyResult;
    quarterIndex: number;
    setQuarterIndex: (i: number) => void;
}) {
    const [statusFilter, setStatusFilter] = useState<"All" | "Not Loaded" | "Not Approved">("All");
    const [fundFilter, setFundFilter] = useState("All");
    const [regionFilter, setRegionFilter] = useState("All");
    const [troubledOnly, setTroubledOnly] = useState(false);
    const [excludedOnly, setExcludedOnly] = useState(false);
    const [swissOnly, setSwissOnly] = useState(false);
    const [search, setSearch] = useState("");
    const [emailInput, setEmailInput] = useState<EmailInput | null>(null);
    const [queue, setQueue] = useState<{ items: QueueEntry[]; index: number } | null>(null);

    const quarter = QUARTERS[quarterIndex];

    const matchesFilters = (person: string, d: QFDealEntry) => {
        if (fundFilter !== "All" && !d.funds.includes(fundFilter)) return false;
        if (regionFilter === "DL Europe" && !d.euInvested) return false;
        if (regionFilter === "DL US" && d.euInvested) return false;
        // Troubled Credit deals are always included by default — the pill excludes them when
        // turned on. Excluded is the opposite: an opt-in inclusion gate, hidden unless turned on.
        if (troubledOnly && d.troubledCredit) return false;
        if (!excludedOnly && d.excluded) return false;
        if (swissOnly && !d.swissHeld) return false;
        if (search) {
            const q = search.toLowerCase();
            if (!d.deal.toLowerCase().includes(q) && !person.toLowerCase().includes(q)) return false;
        }
        return true;
    };

    const notLoaded = useMemo(
        () =>
            (statusFilter === "Not Approved" ? [] : data.notLoaded)
                .map((g) => ({ ...g, deals: g.deals.filter((d) => matchesFilters(g.person, d)) }))
                .filter((g) => g.deals.length > 0),
        [data, statusFilter, fundFilter, regionFilter, troubledOnly, excludedOnly, swissOnly, search],
    );
    const notApproved = useMemo(
        () =>
            (statusFilter === "Not Loaded" ? [] : data.notApproved)
                .map((g) => ({ ...g, deals: g.deals.filter((d) => matchesFilters(g.person, d)) }))
                .filter((g) => g.deals.length > 0),
        [data, statusFilter, fundFilter, regionFilter, troubledOnly, excludedOnly, swissOnly, search],
    );

    const dealsShown = new Set([...notLoaded, ...notApproved].flatMap((g) => g.deals.map((d) => d.deal))).size;

    // "Deals in Quarter" / "% Complete" reflect fund/region/troubled/excluded/search — but not
    // the Not Loaded/Not Approved isolate toggle, since that's a display filter for the two
    // group sections below, not a real narrowing of the quarter's population.
    const filteredDeals = useMemo(
        () =>
            data.deals.filter((d) => {
                if (fundFilter !== "All" && !d.funds.includes(fundFilter)) return false;
                if (regionFilter === "DL Europe" && !d.euInvested) return false;
                if (regionFilter === "DL US" && d.euInvested) return false;
                if (troubledOnly && d.troubledCredit) return false;
                if (!excludedOnly && d.excluded) return false;
                if (swissOnly && !d.swissHeld) return false;
                if (search && !d.deal.toLowerCase().includes(search.toLowerCase())) return false;
                return true;
            }),
        [data, fundFilter, regionFilter, troubledOnly, excludedOnly, swissOnly, search],
    );
    const dealsInQuarterShown = filteredDeals.length;
    const pctComplete = dealsInQuarterShown > 0
        ? ((dealsInQuarterShown
            - filteredDeals.filter((d) => d.status === "not_loaded").length
            - filteredDeals.filter((d) => d.status === "not_approved").length) / dealsInQuarterShown) * 100
        : 0;

    // These two, by contrast, should reflect the isolate toggle (statusFilter) — recomputed
    // from the same filtered notLoaded/notApproved lists used for the sections below, not
    // data.notLoadedCount/data.notApprovedCount which ignore every filter on this page.
    const notLoadedCountShown = notLoaded.reduce((s, g) => s + g.deals.length, 0);
    const notApprovedCountShown = notApproved.reduce((s, g) => s + g.deals.length, 0);

    const notLoadedChart = notLoaded.map((g) => ({ person: g.person, count: g.deals.length }));
    const notApprovedChart = notApproved.map((g) => ({ person: g.person, count: g.deals.length }));

    function openEmail(person: string, status: "Not Loaded" | "Not Approved", deals: QFDealEntry[]) {
        setEmailInput({
            person,
            status,
            quarterLabel: quarter.label,
            deals: deals.map((d) => ({ deal: d.deal, detail: status })),
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
                {QUARTERS.map((q, i) => (
                    <button
                        key={q.label}
                        onClick={() => setQuarterIndex(i)}
                        className={cn(
                            "rounded-sm px-m py-xs text-200 font-medium border",
                            i === quarterIndex
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border bg-card hover:bg-secondary",
                        )}
                    >
                        {q.label}
                    </button>
                ))}
                <span className="w-px self-stretch bg-border" aria-hidden="true" />
                {(["All", "Not Loaded", "Not Approved"] as const).map((s) => (
                    <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                        {s}
                    </FilterPill>
                ))}
                <select
                    value={fundFilter}
                    onChange={(e) => setFundFilter(e.target.value)}
                    className="rounded-sm border border-input bg-card px-m py-xs text-200"
                >
                    <option value="All">All Funds</option>
                    {data.funds.map((f) => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
                <span className="w-px self-stretch bg-border" aria-hidden="true" />
                {REGION_FILTERS.map((f) => (
                    <FilterPill key={f} active={regionFilter === f} onClick={() => setRegionFilter(f)}>
                        {f}
                    </FilterPill>
                ))}
                <span className="w-px self-stretch bg-border" aria-hidden="true" />
                <FilterPill active={troubledOnly} onClick={() => setTroubledOnly((v) => !v)}>Troubled Credit</FilterPill>
                <FilterPill active={excludedOnly} onClick={() => setExcludedOnly((v) => !v)}>Excluded</FilterPill>
                <FilterPill active={swissOnly} onClick={() => setSwissOnly((v) => !v)}>Swiss Held</FilterPill>
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
                <KpiCard label="Deals in Quarter" value={dealsInQuarterShown} />
                <KpiCard
                    label="Not Loaded"
                    value={notLoadedCountShown}
                    accent="medium"
                    subtext="click to isolate"
                    onClick={() => setStatusFilter((v) => (v === "Not Loaded" ? "All" : "Not Loaded"))}
                />
                <KpiCard
                    label="Not Approved"
                    value={notApprovedCountShown}
                    accent="high"
                    subtext="click to isolate"
                    onClick={() => setStatusFilter((v) => (v === "Not Approved" ? "All" : "Not Approved"))}
                />
                <KpiCard label={`${quarter.label} Complete`} value={`${pctComplete.toFixed(1)}%`} subtext={quarter.eD} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-m">
                {notLoadedChart.length > 0 && <PersonBarChart title="Not Loaded by associate" data={notLoadedChart} />}
                {notApprovedChart.length > 0 && <PersonBarChart title="Not Approved by approver" data={notApprovedChart} />}
            </div>

            {notLoaded.length === 0 && notApproved.length === 0 ? (
                <EmptyState message="No deals match the current filters." />
            ) : (
                <>
                    <Section
                        title="Not Loaded — statements missing from CMS"
                        dotColor="var(--color-status-not-loaded)"
                        groups={notLoaded}
                        status="Not Loaded"
                        onEmail={(person, deals) => openEmail(person, "Not Loaded", deals)}
                    />
                    <Section
                        title="Not Approved — awaiting approval"
                        dotColor="var(--color-status-not-approved)"
                        groups={notApproved}
                        status="Not Approved"
                        onEmail={(person, deals) => openEmail(person, "Not Approved", deals)}
                    />
                </>
            )}

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
