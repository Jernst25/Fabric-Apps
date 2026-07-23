import { FCLR } from "@/lib/cms/quarterly";

export function FundPill({ fund }: { fund: string }) {
    const [bg, fg] = FCLR[fund] ?? ["#F1F2F7", "#4B5768"];
    return (
        <span
            className="text-200 rounded px-s py-xxs font-medium whitespace-nowrap"
            style={{ backgroundColor: bg, color: fg }}
        >
            {fund}
        </span>
    );
}
