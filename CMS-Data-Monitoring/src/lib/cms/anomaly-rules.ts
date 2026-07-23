import { asNumber, asString } from "@/lib/dax";

export type Severity = "High" | "Medium" | "Low";

export interface Anomaly {
    company: string;
    type: string;
    metric: string;
    period: string;
    severity: Severity;
    description: string;
}

interface FinRow {
    EntityName: string;
    Period: string;
    DateKey: string;
    PeriodType: string;
    Event: string;
    Level0: string;
    Value: number | null;
}

interface CovenantRow {
    EntityName: string;
    Period: string;
    HIGCovenant: string;
    ValueType: string;
    Value: number | null;
}

interface BlotterRow {
    EntityName: string;
    Comment: string;
    LastModifiedDate: string;
    RealizedUnrealizedStatus: string;
    ExcludeFromReporting: string;
    EntityNotInFinancials: unknown;
    InvestmentDealFullCode: string;
    TroubledCredit: unknown;
    EUInvested: unknown;
}

export interface CompanyFlags {
    excluded: boolean;
    troubledCredit: boolean;
    euInvested: boolean;
}

interface SecRow {
    SecurityID: string;
    SecurityName: string;
    DealCode: string;
    IsInactive: unknown;
}

export const METRICS = [
    "TTM Adj EBITDA",
    "TTM WH Adj EBITDA",
    "Revenue",
    "Net Leverage At Face",
    "Net Leverage Through Class At Face",
    "Interest Coverage",
    "FCCR",
    "EV Multiple",
] as const;

const EBITDA = new Set(["TTM Adj EBITDA", "TTM WH Adj EBITDA"]);
const SORD: Record<Severity, number> = { High: 0, Medium: 1, Low: 2 };

function normalizeFinancials(rows: Record<string, unknown>[]): FinRow[] {
    return rows.map((r) => ({
        EntityName: asString(r.EntityName),
        Period: asString(r.Period),
        DateKey: asString(r.DateKey),
        PeriodType: asString(r.PeriodType),
        Event: asString(r.Event),
        Level0: asString(r.Level0),
        Value: asNumber(r.Value),
    }));
}

function normalizeCovenants(rows: Record<string, unknown>[]): CovenantRow[] {
    return rows.map((r) => ({
        EntityName: asString(r.EntityName),
        Period: asString(r.Period),
        HIGCovenant: asString(r.HIGCovenant),
        ValueType: asString(r.ValueType),
        Value: asNumber(r.Value),
    }));
}

function normalizeBlotter(rows: Record<string, unknown>[]): BlotterRow[] {
    return rows.map((r) => ({
        EntityName: asString(r.EntityName),
        Comment: asString(r.Comment),
        LastModifiedDate: asString(r.LastModifiedDate),
        RealizedUnrealizedStatus: asString(r.RealizedUnrealizedStatus),
        ExcludeFromReporting: asString(r.ExcludeFromReporting),
        EntityNotInFinancials: r.EntityNotInFinancials,
        InvestmentDealFullCode: asString(r.InvestmentDealFullCode),
        TroubledCredit: r.TroubledCredit,
        EUInvested: r.EUInvested,
    }));
}

/** Company-level (EntityName-keyed) flags for the Excluded/Troubled Credit/Region filters, shared across tabs. */
export function buildCompanyFlags(rawBlotter: Record<string, unknown>[]): Map<string, CompanyFlags> {
    const blotter = normalizeBlotter(rawBlotter);
    const m = new Map<string, CompanyFlags>();
    for (const b of blotter) {
        if (!b.EntityName) continue;
        m.set(b.EntityName, {
            excluded: truthy(b.ExcludeFromReporting),
            troubledCredit: truthy(b.TroubledCredit),
            euInvested: truthy(b.EUInvested),
        });
    }
    return m;
}

function normalizeSec(rows: Record<string, unknown>[]): SecRow[] {
    return rows.map((r) => ({
        SecurityID: asString(r.SecurityID),
        SecurityName: asString(r.SecurityName),
        DealCode: asString(r.DealCode),
        IsInactive: r.IsInactive,
    }));
}

function truthy(v: unknown): boolean {
    if (v == null) return false;
    if (typeof v === "boolean") return v;
    const s = String(v).trim().toLowerCase();
    return s === "true" || s === "1" || s === "-1" || s === "yes";
}

/**
 * Detects the 15 documented anomaly types across Financials, Covenants,
 * DealBlotter, and SecMasterDailyView. See cms-monitoring-system-SKILL.md
 * for the full rule definitions this ports.
 */
export function detectAnomalies(
    rawFinancials: Record<string, unknown>[],
    rawCovenants: Record<string, unknown>[],
    rawBlotter: Record<string, unknown>[],
    rawSec: Record<string, unknown>[],
): Anomaly[] {
    const financials = normalizeFinancials(rawFinancials);
    const covenants = normalizeCovenants(rawCovenants);
    const blotter = normalizeBlotter(rawBlotter);
    const sec = normalizeSec(rawSec);

    const out: Anomaly[] = [];
    const push = (
        company: string,
        type: string,
        metric: string,
        period: string,
        severity: Severity,
        description: string,
    ) => out.push({ company, type, metric, period, severity, description });

    // --- Build indexing structures (Quarterly rows only, rules 1-10) ---
    const quarterly = financials.filter((r) => r.PeriodType === "Quarterly" && METRICS.includes(r.Level0 as (typeof METRICS)[number]));

    const byEM = new Map<string, Map<string, { p: string; dk: string; v: number }[]>>();
    const byEP = new Map<string, Map<string, Set<string>>>();
    const acByEM = new Map<string, Map<string, number>>();

    for (const r of quarterly) {
        if (r.Value == null) continue;
        if (!byEM.has(r.EntityName)) byEM.set(r.EntityName, new Map());
        const em = byEM.get(r.EntityName)!;
        if (!em.has(r.Level0)) em.set(r.Level0, []);
        em.get(r.Level0)!.push({ p: r.Period, dk: r.DateKey, v: r.Value });

        if (!byEP.has(r.EntityName)) byEP.set(r.EntityName, new Map());
        const ep = byEP.get(r.EntityName)!;
        if (!ep.has(r.Period)) ep.set(r.Period, new Set());
        ep.get(r.Period)!.add(r.Level0);
    }
    for (const [, em] of byEM) {
        for (const [, series] of em) {
            series.sort((a, b) => a.dk.localeCompare(b.dk));
        }
    }

    // At Close values (rule 9)
    for (const r of financials) {
        if (r.Event !== "At Close" || r.Value == null || !METRICS.includes(r.Level0 as (typeof METRICS)[number])) continue;
        if (!acByEM.has(r.EntityName)) acByEM.set(r.EntityName, new Map());
        const em = acByEM.get(r.EntityName)!;
        if (!em.has(r.Level0)) em.set(r.Level0, r.Value);
    }

    // --- Rules 1-10: per entity/metric series ---
    for (const [entity, em] of byEM) {
        for (const [l0, series] of em) {
            const isE = EBITDA.has(l0);

            for (let i = 0; i < series.length; i++) {
                const c = series[i];

                // Rule 1: Spike/Drop
                if (i >= 3) {
                    const trailing = series.slice(i - 3, i);
                    const avg = trailing.reduce((s, x) => s + x.v, 0) / trailing.length;
                    if (avg !== 0) {
                        const fire = isE ? Math.abs(c.v - avg) > 50 : Math.abs((c.v - avg) / avg) > 0.5;
                        if (fire) {
                            push(entity, "Spike/Drop", l0, c.p, "Low", `${l0} deviates >50${isE ? "" : "%"} from trailing 3-period average (${avg.toFixed(2)} → ${c.v})`);
                        }
                    }
                }

                // Rule 2: Sign Flip
                if (i >= 1) {
                    const prior = series[i - 1];
                    const signFlip = Math.sign(c.v) !== 0 && Math.sign(prior.v) !== 0 && Math.sign(c.v) !== Math.sign(prior.v);
                    if (signFlip) {
                        let skip = false;
                        if (isE && i >= 2) {
                            const p2 = series[i - 2];
                            skip = p2.v > prior.v && prior.v > 0 && c.v < 0;
                        }
                        if (!skip) {
                            push(entity, "Sign Flip", l0, c.p, "High", `${l0} flipped sign period-over-period (${prior.v} → ${c.v})`);
                        }
                    }
                }

                // Rule 3: Zero/Null
                if (c.v === 0) {
                    push(entity, "Zero/Null", l0, c.p, "High", `${l0} reported as zero`);
                }

                // Rule 6: Stale/Duplicate — Interest Coverage only
                if (l0 === "Interest Coverage" && i >= 3) {
                    const w = series.slice(i - 3, i + 1);
                    if (w.every((x) => x.v === w[0].v)) {
                        push(entity, "Stale/Duplicate", l0, c.p, "Medium", `Interest Coverage unchanged (${c.v}) for 3+ consecutive periods`);
                    }
                }

                // Rule 7: Missing Period (gap vs median)
                if (i >= 1) {
                    const gaps: number[] = [];
                    for (let j = 1; j < series.length; j++) {
                        const gap = Number(series[j].dk) - Number(series[j - 1].dk);
                        if (!Number.isNaN(gap)) gaps.push(gap);
                    }
                    if (gaps.length >= 2) {
                        const sorted = [...gaps].sort((a, b) => a - b);
                        const median = sorted[Math.floor(sorted.length / 2)];
                        const thisGap = Number(c.dk) - Number(series[i - 1].dk);
                        if (median > 0 && !Number.isNaN(thisGap) && thisGap > median * 1.8) {
                            push(entity, "Missing Period", l0, c.p, "High", `Gap of ${thisGap} exceeds 1.8x median gap (${median}) for ${l0}`);
                        }
                    }
                }

                // Rule 9: At Close vs Periodic Gap (first periodic value only)
                if (i === 0) {
                    const ac = acByEM.get(entity)?.get(l0);
                    if (ac != null && ac !== 0 && c.v !== 0) {
                        const diff = Math.abs((c.v - ac) / ac);
                        if (diff > 0.3) {
                            push(entity, "At Close vs Periodic Gap", l0, c.p, "Medium", `First periodic value (${c.v}) differs from At Close (${ac}) by ${(diff * 100).toFixed(0)}%`);
                        }
                    }
                }

                // Rule 10: EV Multiple Inconsistency
                if (l0 === "EV Multiple" && i >= 1) {
                    const prior = series[i - 1];
                    if (prior.v !== 0) {
                        const chg = Math.abs((c.v - prior.v) / prior.v);
                        if (chg > 0.2) {
                            push(entity, "EV Multiple Inconsistency", l0, c.p, "Medium", `EV Multiple changed ${(chg * 100).toFixed(0)}% period-over-period (${prior.v} → ${c.v})`);
                        }
                    }
                }
            }
        }
    }

    // Rule 4: Coverage Gap — a metric missing from a period where another metric IS reported
    for (const [entity, ep] of byEP) {
        for (const [period, present] of ep) {
            for (const m of METRICS) {
                if (!present.has(m)) {
                    push(entity, "Coverage Gap", m, period, "High", `${m} missing for period where other metrics are reported`);
                }
            }
        }
    }

    // Rule 5: Leverage Hierarchy Breach — Through Class > At Face same period
    for (const [entity, ep] of byEP) {
        for (const period of ep.keys()) {
            const atFace = byEM.get(entity)?.get("Net Leverage At Face")?.find((x) => x.p === period);
            const throughClass = byEM.get(entity)?.get("Net Leverage Through Class At Face")?.find((x) => x.p === period);
            if (atFace && throughClass) {
                const af = Math.round(atFace.v * 100) / 100;
                const tc = Math.round(throughClass.v * 100) / 100;
                if (tc > af) {
                    push(entity, "Leverage Hierarchy Breach", "Net Leverage Through Class At Face", period, "High", `Through-class leverage (${tc}) exceeds at-face leverage (${af})`);
                }
            }
        }
    }

    // Rule 8: Coverage Inversion — Interest Coverage <= FCCR
    for (const [entity, ep] of byEP) {
        for (const period of ep.keys()) {
            const ic = byEM.get(entity)?.get("Interest Coverage")?.find((x) => x.p === period);
            const fccr = byEM.get(entity)?.get("FCCR")?.find((x) => x.p === period);
            if (ic && fccr && ic.v <= fccr.v) {
                push(entity, "Coverage Inversion", "Interest Coverage", period, "High", `Interest Coverage (${ic.v}) <= FCCR (${fccr.v})`);
            }
        }
    }

    // Rules 11-12: Covenants
    const covByEP = new Map<string, Map<string, CovenantRow[]>>();
    for (const c of covenants) {
        if (!covByEP.has(c.EntityName)) covByEP.set(c.EntityName, new Map());
        const ep = covByEP.get(c.EntityName)!;
        if (!ep.has(c.Period)) ep.set(c.Period, []);
        ep.get(c.Period)!.push(c);
    }

    // Rule 11: No Covenant Reported Value
    for (const [entity, ep] of byEP) {
        for (const period of ep.keys()) {
            const rows = covByEP.get(entity)?.get(period) ?? [];
            const hasReported = rows.some((c) => c.ValueType === "Reported" && c.Value != null && c.Value !== 0);
            if (!hasReported) {
                push(entity, "No Covenant Reported Value", "Covenants", period, "High", `No Covenants[ValueType]="Reported" value for this period`);
            }
        }
    }

    // Rule 12: No Covenant Threshold Value
    const covByEntPeriodName = new Map<string, CovenantRow[]>();
    for (const c of covenants) {
        const key = `${c.EntityName}||${c.Period}||${c.HIGCovenant}`;
        if (!covByEntPeriodName.has(key)) covByEntPeriodName.set(key, []);
        covByEntPeriodName.get(key)!.push(c);
    }
    for (const [key, rows] of covByEntPeriodName) {
        const [entity, period, covenantName] = key.split("||");
        const hasThreshold = rows.some((c) => c.ValueType === "Threshold" && c.Value != null && c.Value !== 0);
        if (!hasThreshold) {
            push(entity, "No Covenant Threshold Value", covenantName, period, "Medium", `No Covenants[ValueType]="Threshold" value for ${covenantName}`);
        }
    }

    // Rule 13: Stale Blotter Comments (90+ days), unrealized, non-excluded
    const NOW = Date.now();
    for (const b of blotter) {
        if (b.RealizedUnrealizedStatus !== "Unrealized") continue;
        if (b.ExcludeFromReporting === "-1" || b.ExcludeFromReporting === "1") continue;
        if (!b.LastModifiedDate) continue;
        const modified = Date.parse(b.LastModifiedDate);
        if (Number.isNaN(modified)) continue;
        const days = (NOW - modified) / 86_400_000;
        if (days >= 90) {
            push(b.EntityName, "Stale Blotter Comment", "DealBlotter", "-", "Low", `Comment not updated in ${Math.floor(days)} days (LastModifiedDate proxy)`);
        }
    }

    // Rule 14: New Deals Missing Financials
    for (const b of blotter) {
        if (truthy(b.EntityNotInFinancials) && b.ExcludeFromReporting !== "-1") {
            push(b.EntityName, "New Deal Missing Financials", "DealBlotter", "-", "High", `EntityNotInFinancials flagged and not excluded from reporting`);
        }
    }

    // Rule 15: Security ID/Name Not Populated
    const realizedEntities = new Set(blotter.filter((b) => b.RealizedUnrealizedStatus !== "Unrealized").map((b) => b.EntityName));
    for (const s of sec) {
        if (truthy(s.IsInactive)) continue;
        if (realizedEntities.has(s.DealCode)) continue;
        if (!s.SecurityID || !s.SecurityName) {
            push(s.DealCode || "(unknown deal)", "Security ID/Name Not Populated", "SecMasterDailyView", "-", "Low", `Active security missing ${!s.SecurityID ? "Security ID" : "Security Name"}`);
        }
    }

    // Dedup on (company, type, period, metric)
    const seen = new Set<string>();
    const deduped = out.filter((a) => {
        const key = `${a.company}||${a.type}||${a.period}||${a.metric}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    deduped.sort((a, b) => SORD[a.severity] - SORD[b.severity] || a.company.localeCompare(b.company));
    return deduped;
}
