import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { type Anomaly, type CompanyFlags, type Severity } from "@/lib/cms/anomaly-rules";
import { KpiCard } from "./KpiCard";
import { SeverityBadge } from "./SeverityBadge";
import { FilterPill } from "./FilterPill";
import { FilterRibbon } from "./FilterRibbon";
import { EmptyState } from "./DataStates";

const SEVERITIES: Severity[] = ["High", "Medium", "Low"];

export function AnomalyBoard({
    anomalies,
    companyFlags,
}: {
    anomalies: Anomaly[];
    companyFlags: Map<string, CompanyFlags>;
}) {
    const [severityFilter, setSeverityFilter] = useState<"All" | Severity>("All");
    const [ruleFilter, setRuleFilter] = useState<string>("All");
    const [troubledOnly, setTroubledOnly] = useState(false);
    const [excludedOnly, setExcludedOnly] = useState(false);
    const [swissOnly, setSwissOnly] = useState(false);
    const [companyFilter, setCompanyFilter] = useState("");

    const ruleTypes = useMemo(() => [...new Set(anomalies.map((a) => a.type))].sort(), [anomalies]);

    const filtered = useMemo(() => {
        return anomalies.filter((a) => {
            if (severityFilter !== "All" && a.severity !== severityFilter) return false;
            if (ruleFilter !== "All" && a.type !== ruleFilter) return false;
            const flags = companyFlags.get(a.company);
            // Opt-in inclusion gates: hidden unless the matching pill is turned on.
            if (!troubledOnly && flags?.troubledCredit) return false;
            if (!excludedOnly && flags?.excluded) return false;
            if (swissOnly && !flags?.swissHeld) return false;
            if (companyFilter && !a.company.toLowerCase().includes(companyFilter.toLowerCase())) return false;
            return true;
        });
    }, [anomalies, severityFilter, ruleFilter, troubledOnly, excludedOnly, swissOnly, companyFilter, companyFlags]);

    const counts = {
        total: anomalies.length,
        High: anomalies.filter((a) => a.severity === "High").length,
        Medium: anomalies.filter((a) => a.severity === "Medium").length,
        Low: anomalies.filter((a) => a.severity === "Low").length,
    };

    return (
        <div className="space-y-l">
            <FilterRibbon>
                <FilterPill active={severityFilter === "All"} onClick={() => setSeverityFilter("All")}>All Severities</FilterPill>
                {SEVERITIES.map((s) => (
                    <FilterPill key={s} active={severityFilter === s} onClick={() => setSeverityFilter(s)}>{s}</FilterPill>
                ))}
                <select
                    value={ruleFilter}
                    onChange={(e) => setRuleFilter(e.target.value)}
                    className="rounded-sm border border-input bg-card px-m py-xs text-200"
                >
                    <option value="All">All Rules</option>
                    {ruleTypes.map((r) => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                <FilterPill active={troubledOnly} onClick={() => setTroubledOnly((v) => !v)}>Troubled Credit</FilterPill>
                <FilterPill active={excludedOnly} onClick={() => setExcludedOnly((v) => !v)}>Excluded</FilterPill>
                <FilterPill active={swissOnly} onClick={() => setSwissOnly((v) => !v)}>Swiss Held</FilterPill>
                <div className="relative ml-auto">
                    <Search className="icon-size-100 absolute left-s top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                        placeholder="Search company…"
                        className="rounded-sm border border-input bg-card pl-[28px] pr-m py-xs text-200 min-w-[220px]"
                    />
                </div>
                <span className="text-200 text-muted-foreground whitespace-nowrap">{filtered.length} anomalies shown</span>
            </FilterRibbon>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-m">
                <KpiCard label="Total Anomalies" value={counts.total} />
                <KpiCard label="High" value={counts.High} accent="high" subtext="click to isolate" onClick={() => setSeverityFilter("High")} />
                <KpiCard label="Medium" value={counts.Medium} accent="medium" subtext="click to isolate" onClick={() => setSeverityFilter("Medium")} />
                <KpiCard label="Low" value={counts.Low} accent="low" subtext="click to isolate" onClick={() => setSeverityFilter("Low")} />
            </div>

            <div className="rounded-sm border border-border bg-card overflow-auto">
                {filtered.length === 0 ? (
                    <EmptyState message="No anomalies match the current filters." />
                ) : (
                    <table className="w-full text-300">
                        <thead>
                            <tr className="border-b border-border text-left text-200 uppercase tracking-wide text-muted-foreground">
                                <th className="px-l py-m font-semibold">Severity</th>
                                <th className="px-l py-m font-semibold">Company</th>
                                <th className="px-l py-m font-semibold">Metric</th>
                                <th className="px-l py-m font-semibold">Period</th>
                                <th className="px-l py-m font-semibold">Rule</th>
                                <th className="px-l py-m font-semibold">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map((a, i) => {
                                const flags = companyFlags.get(a.company);
                                return (
                                    <tr key={i} className="hover:bg-hover">
                                        <td className="px-l py-m"><SeverityBadge severity={a.severity} /></td>
                                        <td className="px-l py-m font-medium">
                                            <div className="flex items-center gap-s flex-wrap">
                                                {a.company}
                                                {flags?.excluded && (
                                                    <span className="text-200 rounded bg-[color:var(--color-sev-high-bg)] text-[color:var(--color-sev-high)] px-s py-xxs font-medium whitespace-nowrap">
                                                        EXCLUDED
                                                    </span>
                                                )}
                                                {flags?.troubledCredit && (
                                                    <span className="text-200 rounded bg-[color:var(--color-sev-medium-bg)] text-[color:var(--color-sev-medium)] px-s py-xxs font-medium whitespace-nowrap">
                                                        TROUBLED CREDIT
                                                    </span>
                                                )}
                                                {flags?.swissHeld && (
                                                    <span className="text-200 rounded bg-muted text-muted-foreground px-s py-xxs font-medium whitespace-nowrap">
                                                        SWISS HELD
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-l py-m">{a.metric}</td>
                                        <td className="px-l py-m">{a.period}</td>
                                        <td className="px-l py-m text-muted-foreground">{a.type}</td>
                                        <td className="px-l py-m text-muted-foreground">{a.description}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
