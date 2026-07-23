import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilterPill({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "rounded-sm px-m py-xs text-200 font-medium border whitespace-nowrap transition-colors",
                active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:bg-secondary",
            )}
        >
            {children}
        </button>
    );
}
