import type { ReactNode } from "react";

export function FilterRibbon({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-wrap items-center gap-xs rounded-sm border border-border bg-card px-m py-s">
            {children}
        </div>
    );
}
