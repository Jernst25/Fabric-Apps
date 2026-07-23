import { Moon, RefreshCw, Sun } from "lucide-react";
import { useAppTheme } from "@/hooks/use-theme";
import { Avatar } from "./Avatar";

function formatTimestamp(d: Date): string {
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

export function Header({
    eyebrow,
    title,
    onRefresh,
    isLoading,
}: {
    eyebrow: string;
    title: string;
    onRefresh: () => void;
    isLoading: boolean;
}) {
    const { isDark, toggleTheme } = useAppTheme();

    return (
        <header className="bg-card border-b border-border">
            <div className="px-xl py-m flex items-center justify-between gap-l">
                <div>
                    <div className="text-200 font-semibold uppercase tracking-wide text-primary mb-xxs">{eyebrow}</div>
                    <div className="text-500 font-semibold text-foreground">{title}</div>
                </div>
                <div className="flex items-center gap-l">
                    <span className="hidden md:inline-flex items-center gap-s rounded-sm bg-secondary px-m py-xs text-200 text-foreground">
                        <span className="icon-size-100 rounded-full bg-[color:var(--color-status-approved)]" />
                        Snapshot · {formatTimestamp(new Date())}
                    </span>
                    <button
                        onClick={onRefresh}
                        aria-label="Refresh data"
                        className="rounded-sm p-s text-primary hover:bg-secondary"
                    >
                        <RefreshCw className={isLoading ? "icon-size-300 animate-spin" : "icon-size-300"} />
                    </button>
                    <button
                        onClick={toggleTheme}
                        aria-label="Toggle dark mode"
                        className="rounded-sm p-s text-primary hover:bg-secondary"
                    >
                        {isDark ? <Sun className="icon-size-300" /> : <Moon className="icon-size-300" />}
                    </button>
                    <Avatar name="CMS User" size="sm" />
                </div>
            </div>
        </header>
    );
}
