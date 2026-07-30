import type { OverdueResult } from "@/lib/cms/overdue";

function personWithMaxDays(overdue: OverdueResult): string | null {
    let best: { person: string; days: number } | null = null;
    for (const g of [...overdue.notLoaded, ...overdue.notApproved]) {
        for (const d of g.deals) {
            if (!best || d.maxDays > best.days) best = { person: g.person, days: d.maxDays };
        }
    }
    return best?.person ?? null;
}

function StatBlock({ value, label, color }: { value: string; label: string; color: string }) {
    return (
        <div className="text-center px-m">
            <div className="font-numeric text-hero-800 font-bold" style={{ color }}>{value}</div>
            <div className="text-100 uppercase tracking-wide text-white/60 whitespace-nowrap">{label}</div>
        </div>
    );
}

export function ExecutiveSnapshotBanner({
    overdue,
    periodLabel,
}: {
    overdue: OverdueResult;
    /** Formatted date of the specific period selected on the page (e.g. "3/31/2026"), or null when "All Periods" is selected. */
    periodLabel: string | null;
}) {
    const totalPeriods = overdue.notLoadedPeriods + overdue.notApprovedPeriods;
    const peopleCount = new Set([...overdue.notLoaded, ...overdue.notApproved].map((g) => g.person)).size;
    const maxPerson = personWithMaxDays(overdue);

    return (
        <div className="rounded-sm bg-[color:var(--color-foreground)] border-l-4 border-accent px-xl py-l flex flex-wrap items-center justify-between gap-l">
            <div className="max-w-[640px]">
                <div className="text-200 font-bold uppercase tracking-wide text-accent mb-xs">Executive Snapshot</div>
                <p className="text-300 text-white leading-400">
                    {periodLabel && <>As of <strong>{periodLabel}</strong>, </>}
                    <strong>{totalPeriods} overdue periods</strong> across <strong>{overdue.totalDealsOverdue} deals</strong> sit
                    with <strong>{peopleCount} people</strong>
                    {maxPerson && (
                        <> — longest outstanding <strong>{overdue.maxDaysOverdue} days</strong> ({maxPerson})</>
                    )}
                    .
                </p>
            </div>
            <div className="flex items-center divide-x divide-white/15">
                <StatBlock value={String(overdue.totalDealsOverdue)} label="Deals" color="#ffffff" />
                <StatBlock value={String(overdue.notLoadedPeriods)} label="Not Loaded" color="var(--color-accent)" />
                <StatBlock value={String(overdue.notApprovedPeriods)} label="Not Approved" color="#F87171" />
            </div>
        </div>
    );
}
