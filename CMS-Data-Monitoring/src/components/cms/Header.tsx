import { Moon, RefreshCw, Sun } from "lucide-react";
import { useAppTheme } from "@/hooks/use-theme";
import { HigMark } from "./HigMark";

function formatTimestamp(d: Date): string {
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

export function Header({ onRefresh, isLoading }: { onRefresh: () => void; isLoading: boolean }) {
    const { isDark, toggleTheme } = useAppTheme();

    return (
        <header className="bg-[color:var(--color-foreground)]">
            <div className="max-w-[1400px] mx-auto px-xl py-m flex items-center justify-between gap-l">
                <div className="flex items-center gap-m">
                    <HigMark />
                    <div>
                        <h1 className="text-400 font-bold text-white tracking-wide">CMS MONITORING SYSTEM</h1>
                        <div className="text-200 uppercase tracking-wide text-[#B1DCFF]">
                            WhiteHorse Direct Lending · Credit Financial Systems
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-m">
                    <span className="hidden md:inline-flex items-center gap-s rounded-full bg-white/10 px-m py-xs text-200 text-white">
                        <span className="icon-size-100 rounded-full bg-[color:var(--color-status-approved)]" />
                        Snapshot · {formatTimestamp(new Date())}
                    </span>
                    <button
                        onClick={onRefresh}
                        aria-label="Refresh data"
                        className="rounded-full p-s text-white hover:bg-white/10"
                    >
                        <RefreshCw className={isLoading ? "icon-size-300 animate-spin" : "icon-size-300"} />
                    </button>
                    <button
                        onClick={toggleTheme}
                        aria-label="Toggle dark mode"
                        className="rounded-full p-s text-white hover:bg-white/10"
                    >
                        {isDark ? <Sun className="icon-size-300" /> : <Moon className="icon-size-300" />}
                    </button>
                </div>
            </div>
        </header>
    );
}
