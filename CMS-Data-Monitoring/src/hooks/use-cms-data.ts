import { useMemo, useState } from "react";
import { anomalyFinancials, anomalyCovenants, anomalyDealBlotter, anomalySecMaster } from "@/queries/anomaly";
import {
    overdueRoster,
    overdueFinancialsPeriods,
    overdueLatestApprover,
    overdueUnapprovedPeriods,
} from "@/queries/overdue";
import {
    quarterlyDealBlotterUnrealized,
    quarterlyFinancialsApproval,
    quarterlyUnapprovedFinancials,
    quarterlyPositionTable,
} from "@/queries/quarterly";
import { useSequentialQueries } from "./use-sequential-queries";
import { rowsToRecords } from "@/lib/dax";
import { buildCompanyFlags, detectAnomalies, type Anomaly, type CompanyFlags } from "@/lib/cms/anomaly-rules";
import { buildOverdue, type OverdueResult } from "@/lib/cms/overdue";
import { buildQuarterly, DEFAULT_QUARTER_INDEX, type QuarterlyResult } from "@/lib/cms/quarterly";

export interface CmsData {
    isLoading: boolean;
    error: Error | undefined;
    anomalies: Anomaly[] | null;
    companyFlags: Map<string, CompanyFlags>;
    overdue: OverdueResult | null;
    quarterly: QuarterlyResult | null;
    quarterIndex: number;
    setQuarterIndex: (i: number) => void;
    refetch: () => Promise<void>;
}

/**
 * Fetches all 10 DAX queries backing the three CMS tabs, in sequence
 * (the semantic model times out under concurrent query load), and derives
 * the anomaly/overdue/quarterly view models used by both the tabs and the
 * Executive Snapshot banner.
 */
export function useCmsData(): CmsData {
    const [quarterIndex, setQuarterIndex] = useState(DEFAULT_QUARTER_INDEX);

    const specs = useMemo(
        () => [
            anomalyFinancials(),
            anomalyCovenants(),
            anomalyDealBlotter(),
            anomalySecMaster(),
            overdueRoster(),
            overdueFinancialsPeriods(),
            overdueLatestApprover(),
            overdueUnapprovedPeriods(),
            quarterlyDealBlotterUnrealized(),
            quarterlyFinancialsApproval(),
            quarterlyUnapprovedFinancials(),
            quarterlyPositionTable(),
        ],
        [],
    );
    const { results, isLoading, error, refetch } = useSequentialQueries(specs);

    const [
        finRes, covRes, blotRes, secRes,
        rosterRes, finPeriodsRes, latestApproverRes, unapprovedPeriodsRes,
        qBlotterRes, qApprovalRes, qUnapprovedRes, qPositionRes,
    ] = results;

    const anomalies = useMemo(() => {
        if (finRes?.status !== "success" || covRes?.status !== "success" || blotRes?.status !== "success" || secRes?.status !== "success") {
            return null;
        }
        return detectAnomalies(
            rowsToRecords(finRes.table),
            rowsToRecords(covRes.table),
            rowsToRecords(blotRes.table),
            rowsToRecords(secRes.table),
        );
    }, [finRes, covRes, blotRes, secRes]);

    // Position Table backs the Swiss Held filter across all tabs, in addition to Quarterly's
    // own fund-badge lookup — fetched once here and shared by all three domain builders below.
    const positionRows = useMemo(
        () => (qPositionRes?.status === "success" ? rowsToRecords(qPositionRes.table) : []),
        [qPositionRes],
    );

    const companyFlags = useMemo(() => {
        if (blotRes?.status !== "success") return new Map<string, CompanyFlags>();
        return buildCompanyFlags(rowsToRecords(blotRes.table), positionRows);
    }, [blotRes, positionRows]);

    const overdue = useMemo(() => {
        if (
            rosterRes?.status !== "success" ||
            finPeriodsRes?.status !== "success" ||
            latestApproverRes?.status !== "success" ||
            unapprovedPeriodsRes?.status !== "success"
        ) {
            return null;
        }
        return buildOverdue(
            rowsToRecords(rosterRes.table),
            rowsToRecords(finPeriodsRes.table),
            rowsToRecords(latestApproverRes.table),
            rowsToRecords(unapprovedPeriodsRes.table),
            positionRows,
        );
    }, [rosterRes, finPeriodsRes, latestApproverRes, unapprovedPeriodsRes, positionRows]);

    const quarterly = useMemo(() => {
        if (qBlotterRes?.status !== "success" || qApprovalRes?.status !== "success" || qUnapprovedRes?.status !== "success") {
            return null;
        }
        return buildQuarterly(
            quarterIndex,
            rowsToRecords(qBlotterRes.table),
            rowsToRecords(qApprovalRes.table),
            rowsToRecords(qUnapprovedRes.table),
            positionRows,
        );
    }, [qBlotterRes, qApprovalRes, qUnapprovedRes, positionRows, quarterIndex]);

    return { isLoading, error, anomalies, companyFlags, overdue, quarterly, quarterIndex, setQuarterIndex, refetch };
}
