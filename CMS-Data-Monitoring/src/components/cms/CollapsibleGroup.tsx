import { useState, type ReactNode } from "react";
import { ChevronDown, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";

export function CollapsibleGroup({
    person,
    subtitle,
    stat,
    onEmail,
    children,
    defaultOpen = false,
}: {
    person: string;
    subtitle: string;
    stat?: ReactNode;
    onEmail: () => void;
    children: ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="bg-card">
            <div className="flex items-center gap-m px-l py-m">
                <button
                    onClick={() => setOpen((o) => !o)}
                    className="flex items-center gap-m flex-1 min-w-0 text-left"
                    aria-expanded={open}
                >
                    <Avatar name={person} />
                    <span className="min-w-0">
                        <span className="block font-semibold text-300 truncate">{person}</span>
                        <span className="block text-200 text-muted-foreground">{subtitle}</span>
                    </span>
                </button>
                {stat}
                <button
                    onClick={onEmail}
                    aria-label={`Draft email to ${person}`}
                    className="inline-flex items-center justify-center rounded-lg border border-border p-s text-primary hover:bg-secondary shrink-0"
                >
                    <Mail className="icon-size-200" />
                </button>
                <button
                    onClick={() => setOpen((o) => !o)}
                    aria-label={open ? "Collapse" : "Expand"}
                    className="shrink-0 p-xs text-muted-foreground"
                >
                    <ChevronDown className={cn("icon-size-300 transition-transform", open && "rotate-180")} />
                </button>
            </div>
            {open && <div className="border-t border-border divide-y divide-border">{children}</div>}
        </div>
    );
}
