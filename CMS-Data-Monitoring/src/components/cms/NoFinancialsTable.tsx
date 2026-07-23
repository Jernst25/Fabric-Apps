import { ExternalLink } from "lucide-react";
import type { NoFinancialsDeal } from "@/lib/cms/overdue";
import { cmsUrl } from "@/lib/cms/utils";

export function NoFinancialsTable({ deals }: { deals: NoFinancialsDeal[] }) {
    if (deals.length === 0) return null;

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-l py-m border-b border-border">
                <h3 className="text-400 font-semibold">Deals with No Financials</h3>
                <p className="text-200 text-muted-foreground mt-xxs">
                    Review surface, not an overdue count — some entries may be non-reporting vehicles. Confirm before treating as a genuine gap.
                </p>
            </div>
            <table className="w-full text-300">
                <thead>
                    <tr className="border-b border-border text-left text-200 uppercase tracking-wide text-muted-foreground">
                        <th className="px-l py-s font-semibold">Deal</th>
                        <th className="px-l py-s font-semibold">Deal SRM ID</th>
                        <th className="px-l py-s font-semibold">Responsible</th>
                        <th className="px-l py-s font-semibold">Last Expected</th>
                        <th className="px-l py-s font-semibold">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {deals.map((d) => (
                        <tr key={d.dealSrmId} className="hover:bg-hover">
                            <td className="px-l py-s font-medium">
                                <div className="flex items-center gap-s flex-wrap">
                                    <a
                                        href={cmsUrl(d.deal)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-xs"
                                    >
                                        {d.deal}
                                        <ExternalLink className="icon-size-100" />
                                    </a>
                                    {d.excluded && (
                                        <span className="text-200 rounded bg-[color:var(--color-sev-high-bg)] text-[color:var(--color-sev-high)] px-s py-xxs font-medium whitespace-nowrap">
                                            EXCLUDED
                                        </span>
                                    )}
                                    {d.troubledCredit && (
                                        <span className="text-200 rounded bg-[color:var(--color-sev-medium-bg)] text-[color:var(--color-sev-medium)] px-s py-xxs font-medium whitespace-nowrap">
                                            TROUBLED CREDIT
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-l py-s text-muted-foreground">{d.dealSrmId}</td>
                            <td className="px-l py-s">{d.person}</td>
                            <td className="px-l py-s text-muted-foreground">{d.lastExpectedFinancialsDate ?? "—"}</td>
                            <td className="px-l py-s">
                                <span className="text-200 rounded bg-muted px-s py-xxs font-medium">Review</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
