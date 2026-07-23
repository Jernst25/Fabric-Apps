export function PersonBarChart({
    title,
    data,
}: {
    title: string;
    data: { person: string; count: number; deals?: string[] }[];
}) {
    const max = Math.max(1, ...data.map((d) => d.count));

    return (
        <div className="rounded-sm border border-border bg-card p-l">
            <h3 className="text-400 font-semibold mb-m">{title}</h3>
            <div className="space-y-m">
                {[...data]
                    .sort((a, b) => b.count - a.count)
                    .map((d) => {
                        const pct = (d.count / max) * 100;
                        return (
                            <div key={d.person}>
                                <div className="flex items-center gap-m">
                                    <span className="w-[120px] shrink-0 truncate text-300 text-muted-foreground">{d.person}</span>
                                    <div className="flex-1 h-[10px] rounded-sm bg-muted overflow-hidden">
                                        <div className="h-full rounded-sm bg-primary" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="w-[24px] shrink-0 text-right text-300 font-bold">{d.count}</span>
                                </div>
                                {d.deals && d.deals.length > 0 && (
                                    <div className="pl-[132px] text-100 text-muted-foreground leading-400">
                                        {d.deals.join(", ")}
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
