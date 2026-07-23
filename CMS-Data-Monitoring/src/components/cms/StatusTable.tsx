import { useState } from "react";
import { Copy } from "lucide-react";
import type { StatusRow } from "@/lib/cms/overdue";
import { copyTextToClipboard } from "@/lib/cms/utils";
import { StatusBadge } from "./StatusBadge";

function flagsOf(r: StatusRow): string {
    return [r.excluded && "Excluded", r.troubledCredit && "Troubled Credit", r.swissHeld && "Swiss Held"].filter(Boolean).join(", ");
}

function toTsv(rows: StatusRow[]): string {
    const header = ["Deal", "Periods", "Loading Status", "Individual Responsible", "Realized/Unrealized", "Flags"];
    const lines = rows.map((r) => [r.deal, r.periods, r.loadingStatus, r.responsible, r.realizedStatus, flagsOf(r)].join("\t"));
    return [header.join("\t"), ...lines].join("\n");
}

export function StatusTable({ rows }: { rows: StatusRow[] }) {
    const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

    async function handleCopy() {
        const ok = await copyTextToClipboard(toTsv(rows));
        setCopyState(ok ? "copied" : "failed");
        setTimeout(() => setCopyState("idle"), 2500);
    }

    if (rows.length === 0) return null;

    return (
        <div className="rounded-sm border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-l py-m border-b border-border">
                <h3 className="text-400 font-semibold">Status Table</h3>
                <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-xs rounded-sm border border-border px-m py-s text-200 font-medium hover:bg-secondary"
                >
                    <Copy className="icon-size-200" />
                    {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Copy failed — try again" : "Copy table"}
                </button>
            </div>
            <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-300">
                    <thead>
                        <tr className="border-b border-border text-left text-200 uppercase tracking-wide text-muted-foreground sticky top-0 bg-card">
                            <th className="px-l py-s font-semibold">Deal</th>
                            <th className="px-l py-s font-semibold">Periods</th>
                            <th className="px-l py-s font-semibold">Loading Status</th>
                            <th className="px-l py-s font-semibold">Responsible</th>
                            <th className="px-l py-s font-semibold">Realized/Unrealized</th>
                            <th className="px-l py-s font-semibold">Flags</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rows.map((r, i) => (
                            <tr key={i} className="hover:bg-hover">
                                <td className="px-l py-s font-medium">{r.deal}</td>
                                <td className="px-l py-s text-muted-foreground">{r.periods}</td>
                                <td className="px-l py-s">
                                    {r.loadingStatus === "No Financials" ? (
                                        <span className="text-200 rounded bg-muted px-s py-xxs font-medium">No Financials</span>
                                    ) : (
                                        <StatusBadge status={r.loadingStatus} />
                                    )}
                                </td>
                                <td className="px-l py-s">{r.responsible}</td>
                                <td className="px-l py-s text-muted-foreground">{r.realizedStatus}</td>
                                <td className="px-l py-s text-muted-foreground">{flagsOf(r) || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
