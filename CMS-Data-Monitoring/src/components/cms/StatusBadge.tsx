import { cn } from "@/lib/utils";

type Status = "Not Loaded" | "Not Approved" | "Approved";

const STYLES: Record<Status, string> = {
    "Not Loaded": "bg-[color:var(--color-status-not-loaded-bg)] text-[color:var(--color-status-not-loaded)]",
    "Not Approved": "bg-[color:var(--color-status-not-approved-bg)] text-[color:var(--color-status-not-approved)]",
    Approved: "bg-[color:var(--color-status-approved-bg)] text-[color:var(--color-status-approved)]",
};

export function StatusBadge({ status }: { status: Status }) {
    return (
        <span className={cn("inline-flex items-center rounded px-s py-xxs text-200 font-semibold whitespace-nowrap", STYLES[status])}>
            {status}
        </span>
    );
}
