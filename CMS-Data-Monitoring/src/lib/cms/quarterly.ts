import { asString, truthy } from "@/lib/dax";
import { lastInTeam, secLastInTeam, splitCamel } from "./utils";

export interface Quarter {
    label: string;
    mo: string;
    qp: string;
    eL: string;
    eD: string;
}

export const QUARTERS: Quarter[] = [
    { label: "Q3 2025", mo: "Sep 2025", qp: "Q3 2025", eL: "Sep-25", eD: "2025-09-30" },
    { label: "Q4 2025", mo: "Dec 2025", qp: "Q4 2025", eL: "Dec-25", eD: "2025-12-31" },
    { label: "Q1 2026", mo: "Mar 2026", qp: "Q1 2026", eL: "Mar-26", eD: "2026-03-31" },
    { label: "Q2 2026", mo: "Jun 2026", qp: "Q2 2026", eL: "Jun-26", eD: "2026-06-30" },
];
export const DEFAULT_QUARTER_INDEX = 3;

export const QEND: Record<string, string> = {
    "2025-09-30": "Sep-25",
    "2025-12-31": "Dec-25",
    "2026-03-31": "Mar-26",
    "2026-06-30": "Jun-26",
};

export const F2P: Record<string, string> = {
    "ABF SMA": "ABF", "BCSSS": "BCSSS", "CEPB": "CEPB", "DLF": "DLF", "DLF Offs": "DLF Offs",
    "DLOFF20": "DLOFF20", "DLON20": "DLON20", "FSBA": "FSBA", "GCOF": "GCOF", "HELI2025": "HELI2025",
    "HSBC": "HSBC", "HTAMMEU": "HTAMMEU", "HTAMMUS": "HTAMMUS", "MPS": "MPS", "SSGCC": "SSGCC",
    "WHF STRS": "STRS JV", "SwHYS A": "Swiss On", "SwHYS B": "Swiss On", "SwHYSOFF": "SwissOff",
    "TMRS": "TMRS", "TCRS": "TriStar", "VRS SMA": "VRS SMA", "WHF Inc.": "WHF Inc.",
    "WHMM": "WHMM", "WHMMC": "WHMMC", "WHMMFH": "WHMMFINH", "WHMMK": "WHMMK", "WHMML": "WHMML",
    "WHMMTA": "WHMMT", "WHMMTB": "WHMMT", "WHMMU": "WHMMU",
    "WHPL2024": "WHPL OFF", "WHPL2025": "WHPL OFF", "WHPL2026": "WHPL OFF", "WHPL2027": "WHPL OFF",
    "WHPL2028": "WHPL OFF", "WHPL2029": "WHPL OFF", "WHPL2030": "WHPL OFF",
    "WHPL25H1": "WHPL OFF", "WHPL26H1": "WHPL OFF", "WHPL27H1": "WHPL OFF",
    "WHPL28H1": "WHPL OFF", "WHPL29H1": "WHPL OFF",
    "WPLC2224": "WHPL OFF", "WPLC2225": "WHPL OFF", "WPLC2226": "WHPL OFF", "WPLC2227": "WHPL OFF",
    "WPLC2228": "WHPL OFF", "WPLC2229": "WHPL OFF", "WPLC2230": "WHPL OFF",
    "WHPL": "WHPLON", "WHPLH1": "WHPLON", "WPLC22ON": "WHPLON",
    "TERRA": "WHPLTERA", "TERRAC": "WHPLTERA", "WHPLUBS": "WHPLUBS",
    "4MBL": "WHTAXBLK", "ASBL": "WHTAXBLK", "BlueWave": "WHTAXBLK", "HMFH": "WHTAXBLK",
    "NEXTK": "WHTAXBLK", "QEBL": "WHTAXBLK", "WEST": "WHTAXBLK",
    "WHYOS": "WHYOS", "WHYOSCO": "WHYOSCO", "PARTS": "PARTS",
};

export const FCLR: Record<string, [string, string]> = {
    "WHPLON": ["#EFF6FF", "#1D4ED8"], "WHPL OFF": ["#DBEAFE", "#1E40AF"],
    "WHPLUBS": ["#E0E7FF", "#3730A3"], "WHPLTERA": ["#EDE9FE", "#5B21B6"],
    "WHMM": ["#F0FDF4", "#166534"], "WHMML": ["#DCFCE7", "#15803D"],
    "WHMMU": ["#D1FAE5", "#065F46"], "WHMMT": ["#ECFDF5", "#047857"],
    "Swiss On": ["#FFF7ED", "#9A3412"], "SwissOff": ["#FFEDD5", "#7C2D12"],
    "TMRS": ["#FEF2F2", "#991B1B"], "TriStar": ["#FEF2F2", "#7F1D1D"],
    "SSGCC": ["#FAF5FF", "#6B21A8"], "STRS JV": ["#FDF4FF", "#701A75"],
    "WHF Inc.": ["#F1F5F9", "#334155"], "WHTAXBLK": ["#F9FAFB", "#6B7280"],
};

export type QFStatus = "approved" | "not_approved" | "not_loaded" | "skip";

interface BlotterDeal {
    entity: string;
    team: string;
    comment: string | null;
    exclude: boolean;
    troubledCredit: boolean;
    euInvested: boolean;
    atClose: string;
}

export interface QFDealView {
    deal: string;
    funds: string[];
    status: QFStatus;
    comment: string | null;
    excluded: boolean;
    troubledCredit: boolean;
    euInvested: boolean;
}

export interface QFDealEntry {
    deal: string;
    funds: string[];
    comment: string | null;
    excluded: boolean;
    troubledCredit: boolean;
    euInvested: boolean;
}

export interface QFPersonGroup {
    person: string;
    deals: QFDealEntry[];
}

export interface QuarterlyResult {
    deals: QFDealView[];
    notLoaded: QFPersonGroup[];
    notApproved: QFPersonGroup[];
    dealsInQuarter: number;
    notLoadedCount: number;
    notApprovedCount: number;
    quarterEndDate: string;
    funds: string[];
}

function buildBlotterDeals(rawBlotter: Record<string, unknown>[]): BlotterDeal[] {
    return rawBlotter.map((r) => ({
        entity: asString(r.EntityName),
        team: asString(r.DealTeam),
        comment: asString(r.Comment) || null,
        exclude: truthy(r.ExcludeFromReporting),
        troubledCredit: truthy(r.TroubledCredit),
        euInvested: truthy(r["EU Invested"]),
        atClose: asString(r.AtCloseDate),
    }));
}

function buildFinMap(rawApproval: Record<string, unknown>[]): {
    finMap: Set<string>;
    approverByEntity: Map<string, string>;
} {
    const finMap = new Set<string>();
    const approverByEntity = new Map<string, string>();
    for (const r of rawApproval) {
        const entity = asString(r.EntityName);
        const period = asString(r.Period);
        const approved = asString(r.Approved);
        const approver = asString(r.LatestApprover);
        if (approved === "Approved") finMap.add(`${entity}||${period}`);
        if (entity && approver && !approverByEntity.has(entity)) {
            approverByEntity.set(entity, splitCamel(approver));
        }
    }
    return { finMap, approverByEntity };
}

function buildUnapprovedSet(rawUnapproved: Record<string, unknown>[]): Set<string> {
    const s = new Set<string>();
    for (const r of rawUnapproved) {
        const entity = asString(r.EntityName);
        const asOfDate = asString(r.AsOfDate);
        const qEnd = QEND[asOfDate];
        if (entity && qEnd) s.add(`${entity}||${qEnd}`);
    }
    return s;
}

function buildPosMap(rawPosition: Record<string, unknown>[]): Map<string, string[]> {
    const m = new Map<string, string[]>();
    for (const r of rawPosition) {
        const srmId = asString(r["Investment Deal SRM ID"]);
        const fund = asString(r.Fund);
        if (!srmId || !fund) continue;
        const display = F2P[fund] ?? fund;
        if (!m.has(srmId)) m.set(srmId, []);
        const list = m.get(srmId)!;
        if (!list.includes(display)) list.push(display);
    }
    return m;
}

function qfStatus(
    deal: BlotterDeal,
    quarter: Quarter,
    finMap: Set<string>,
    unapprSet: Set<string>,
): QFStatus {
    if (deal.atClose && deal.atClose > quarter.eD) return "skip";
    if (finMap.has(`${deal.entity}||${quarter.mo}`) || finMap.has(`${deal.entity}||${quarter.qp}`)) return "approved";
    if (unapprSet.has(`${deal.entity}||${quarter.eL}`)) return "not_approved";
    return "not_loaded";
}

export function buildQuarterly(
    quarterIndex: number,
    rawBlotter: Record<string, unknown>[],
    rawApproval: Record<string, unknown>[],
    rawUnapproved: Record<string, unknown>[],
    rawPosition: Record<string, unknown>[],
): QuarterlyResult {
    const quarter = QUARTERS[quarterIndex] ?? QUARTERS[DEFAULT_QUARTER_INDEX];
    const blotterDeals = buildBlotterDeals(rawBlotter);
    const { finMap, approverByEntity } = buildFinMap(rawApproval);
    const unapprSet = buildUnapprovedSet(rawUnapproved);
    const posMap = buildPosMap(rawPosition);

    const dealsSrmByEntity = new Map<string, string>();
    for (const r of rawBlotter) {
        const entity = asString(r.EntityName);
        const srmId = asString(r.DealSrmId);
        if (entity && srmId) dealsSrmByEntity.set(entity, srmId);
    }

    const deals: QFDealView[] = blotterDeals.map((d) => {
        const srmId = dealsSrmByEntity.get(d.entity) ?? "";
        return {
            deal: d.entity,
            funds: posMap.get(srmId) ?? [],
            status: qfStatus(d, quarter, finMap, unapprSet),
            comment: d.comment,
            excluded: d.exclude,
            troubledCredit: d.troubledCredit,
            euInvested: d.euInvested,
        };
    });

    // ExcludeFromReporting no longer hides a deal — it's still reconciled and
    // shown, just flagged. Only "skip" (not yet active at quarter-end) is hidden.
    const visible = deals.filter((d) => d.status !== "skip");
    const allFunds = [...new Set(visible.flatMap((d) => d.funds))].sort();

    function group(status: QFStatus, personOf: (d: BlotterDeal) => string): QFPersonGroup[] {
        const byPerson = new Map<string, QFDealEntry[]>();
        for (const d of blotterDeals) {
            const view = deals.find((v) => v.deal === d.entity);
            if (!view || view.status !== status) continue;
            const person = personOf(d) || "(Unassigned)";
            if (!byPerson.has(person)) byPerson.set(person, []);
            byPerson.get(person)!.push({
                deal: d.entity,
                funds: view.funds,
                comment: d.comment,
                excluded: d.exclude,
                troubledCredit: d.troubledCredit,
                euInvested: d.euInvested,
            });
        }
        return [...byPerson.entries()]
            .map(([person, ds]) => ({ person, deals: ds }))
            .sort((a, b) => b.deals.length - a.deals.length);
    }

    const notLoaded = group("not_loaded", (d) => lastInTeam(d.team));
    const notApproved = group("not_approved", (d) => approverByEntity.get(d.entity) || secLastInTeam(d.team));

    return {
        deals: visible,
        notLoaded,
        notApproved,
        dealsInQuarter: visible.length,
        notLoadedCount: visible.filter((d) => d.status === "not_loaded").length,
        notApprovedCount: visible.filter((d) => d.status === "not_approved").length,
        quarterEndDate: quarter.eD,
        funds: allFunds,
    };
}
