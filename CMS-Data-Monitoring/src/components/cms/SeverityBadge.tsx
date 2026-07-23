import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/cms/anomaly-rules";

const STYLES: Record<Severity, string> = {
    High: "bg-[color:var(--color-sev-high-bg)] text-[color:var(--color-sev-high)]",
    Medium: "bg-[color:var(--color-sev-medium-bg)] text-[color:var(--color-sev-medium)]",
    Low: "bg-[color:var(--color-sev-low-bg)] text-[color:var(--color-sev-low)]",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
    return (
        <span className={cn("inline-flex items-center rounded px-s py-xxs text-200 font-semibold", STYLES[severity])}>
            {severity}
        </span>
    );
}
