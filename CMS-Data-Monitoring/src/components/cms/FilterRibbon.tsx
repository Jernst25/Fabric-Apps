import type { ReactNode } from "react";

export function FilterRibbon({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-wrap items-center gap-s rounded-xl border border-border bg-card px-l py-m">
            {children}
        </div>
    );
}
