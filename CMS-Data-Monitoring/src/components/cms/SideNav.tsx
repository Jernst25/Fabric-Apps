import { cn } from "@/lib/utils";

export interface NavItemDef {
    id: string;
    label: string;
    badge: string;
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
        <nav className="w-[240px] shrink-0 border-r border-border bg-card py-l px-s space-y-xs">
            {items.map((item) => {
                const active = item.id === activeItem;
                return (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                            "w-full flex items-center gap-m rounded-lg px-m py-m text-300 font-medium text-left transition-colors",
                            active
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-secondary",
                        )}
                    >
                        <span className="flex-1 truncate">{item.label}</span>
                        <span
                            className={cn(
                                "rounded-full px-s py-xxs text-200 font-bold whitespace-nowrap",
                                active ? "bg-white/20" : "bg-muted text-muted-foreground",
                            )}
                        >
                            {item.badge}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
