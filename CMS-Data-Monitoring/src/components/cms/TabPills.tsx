import { cn } from "@/lib/utils";

export interface TabPillDef {
    id: string;
    label: string;
    badge: string;
    index: number;
}

export function TabPills({
    tabs,
    activeTab,
    onSelect,
}: {
    tabs: TabPillDef[];
    activeTab: string;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-s">
            {tabs.map((tab) => {
                const active = tab.id === activeTab;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onSelect(tab.id)}
                        className={cn(
                            "flex items-center gap-m rounded-xl px-l py-m border text-300 font-semibold transition-colors",
                            active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border text-foreground hover:bg-secondary",
                        )}
                    >
                        {tab.label}
                        <span
                            className={cn(
                                "rounded-full px-s py-xxs text-200 font-bold",
                                active ? "bg-white/20" : "bg-muted text-muted-foreground",
                            )}
                        >
                            {tab.badge}
                        </span>
                        <span
                            className={cn(
                                "flex items-center justify-center icon-size-400 rounded text-100 font-bold",
                                active ? "bg-white/15" : "bg-muted text-muted-foreground",
                            )}
                        >
                            {tab.index}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
