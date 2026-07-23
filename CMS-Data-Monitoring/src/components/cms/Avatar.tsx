import { initials } from "@/lib/cms/utils";

const PALETTE = [
    "#8E2A44", // burgundy
    "#166534", // green
    "#1D4ED8", // blue
    "#7C4A1E", // brown
    "#B7791F", // gold
    "#374151", // slate
    "#0E7490", // teal
    "#6B21A8", // purple
];

function hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
    const color = PALETTE[hashString(name) % PALETTE.length];
    return (
        <span
            className={
                (size === "sm" ? "icon-size-500 text-100" : "icon-size-600 text-200") +
                " flex items-center justify-center rounded-full font-semibold text-white shrink-0"
            }
            style={{ backgroundColor: color }}
        >
            {initials(name)}
        </span>
    );
}
