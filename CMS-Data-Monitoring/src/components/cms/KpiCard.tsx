import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function KpiCard({
    label,
    value,
    accent,
    icon,
    subtext,
    onClick,
}: {
    label: string;
    value: ReactNode;
    accent?: "default" | "high" | "medium" | "low";
    icon?: ReactNode;
    subtext?: string;
    onClick?: () => void;
}) {
    const valueColor =
        accent === "high"
            ? "text-[color:var(--color-sev-high)]"
            : accent === "medium"
              ? "text-[color:var(--color-sev-medium)]"
              : accent === "low"
                ? "text-[color:var(--color-sev-low)]"
                : "text-foreground";

    const Tag = onClick ? "button" : "div";

    return (
        <Tag
            onClick={onClick}
            className={cn(
                "rounded-sm border border-border bg-card p-l flex items-start justify-between text-left w-full",
                "transition-all duration-150 hover:-translate-y-[3px] hover:shadow-lg hover:border-primary",
                onClick && "cursor-pointer",
            )}
        >
            <div>
                <div className="text-200 font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className={cn("font-numeric text-hero-800 font-bold mt-xs", valueColor)}>{value}</div>
                {subtext && <div className="text-200 text-muted-foreground mt-xxs">{subtext}</div>}
            </div>
            {icon && <div className="text-muted-foreground icon-size-500">{icon}</div>}
        </Tag>
    );
}
