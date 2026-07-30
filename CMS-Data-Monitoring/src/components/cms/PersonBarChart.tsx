import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PersonBarChart({
    title,
    data,
}: {
    title: string;
    data: { person: string; count: number; deals?: string[]; hasComment?: boolean }[];
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
                                    <span
                                        className={cn(
                                            "w-[160px] shrink-0 flex items-center gap-xs truncate text-100",
                                            d.hasComment ? "font-semibold text-[color:var(--color-alert)]" : "text-muted-foreground",
                                        )}
                                        title={d.hasComment ? "Has an active blotter comment (Hold email)" : undefined}
                                    >
                                        {d.hasComment && <AlertTriangle className="icon-size-100 shrink-0" />}
                                        <span className="truncate">{d.person}</span>
                                    </span>
                                    <div className="flex-1 h-[10px] rounded-sm bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-sm"
                                            style={{
                                                width: `${pct}%`,
                                                backgroundColor: d.hasComment ? "var(--color-alert)" : "var(--color-primary)",
                                            }}
                                        />
                                    </div>
                                    <span className="w-[24px] shrink-0 text-right text-300 font-bold">{d.count}</span>
                                </div>
                                {d.deals && d.deals.length > 0 && (
                                    <div className="pl-[172px] text-100 text-muted-foreground leading-400">
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
