export function DaysBar({ days, maxDays }: { days: number; maxDays: number }) {
    const pct = maxDays > 0 ? Math.min(100, (days / maxDays) * 100) : 0;
    const color = days >= 120 ? "var(--color-sev-high)" : days >= 60 ? "var(--color-accent)" : "var(--color-status-not-loaded)";
    return (
        <div className="flex items-center gap-s">
            <div className="w-[90px] h-[6px] rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-200 text-muted-foreground whitespace-nowrap">{days}d max</span>
        </div>
    );
}
