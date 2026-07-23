import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function GroupList({
    title,
    dotColor,
    badge,
    children,
    defaultOpen = true,
}: {
    title: string;
    dotColor: string;
    badge: string;
    children: ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="rounded-xl border border-border overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="w-full flex items-center gap-m px-l py-m bg-muted text-left"
            >
                <span className="icon-size-100 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                <span className="font-semibold text-300 flex-1">{title}</span>
                <span className="rounded-full bg-card border border-border px-m py-xxs text-200 font-medium text-muted-foreground whitespace-nowrap">
                    {badge}
                </span>
                <ChevronDown className={cn("icon-size-300 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
            </button>
            {open && <div className="divide-y divide-border bg-card">{children}</div>}
        </div>
    );
}
