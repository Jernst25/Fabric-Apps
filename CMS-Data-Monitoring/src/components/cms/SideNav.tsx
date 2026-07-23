import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { HigMark } from "./HigMark";

export interface NavItemDef {
    id: string;
    label: string;
    icon: LucideIcon;
}

export function SideNav({
    items,
    activeItem,
    onSelect,
}: {
    items: NavItemDef[];
    activeItem: string;
    onSelect: (id: string) => void;
}) {
    return (
        <nav className="w-[252px] shrink-0 bg-[color:var(--color-foreground)] flex flex-col">
            <div className="px-l pt-l pb-m border-b border-white/15">
                <HigMark />
                <div className="mt-m text-300 font-bold tracking-wide text-white">CMS DATA MONITORING SYSTEM</div>
            </div>
            <div className="flex flex-col gap-xxs p-s flex-1">
                {items.map((item) => {
                    const active = item.id === activeItem;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "w-full flex items-center gap-m rounded-sm px-m py-m text-300 font-medium text-left transition-colors",
                                active
                                    ? "bg-primary text-white"
                                    : "text-white/75 hover:bg-white/10 hover:text-white",
                            )}
                        >
                            <Icon className="icon-size-200 shrink-0" />
                            <span className="flex-1 truncate">{item.label}</span>
                        </button>
                    );
                })}
            </div>
            <div className="px-l py-l border-t border-white/15 text-200 leading-400 text-white/45">
                WhiteHorse Direct Lending Portfolio
            </div>
        </nav>
    );
}
