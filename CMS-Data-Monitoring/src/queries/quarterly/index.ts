import dealBlotterUnrealizedQuery from "./deal-blotter-unrealized.dax?raw";
import financialsApprovalQuery from "./financials-approval.dax?raw";
import unapprovedFinancialsQuery from "./unapproved-financials.dax?raw";
import positionTableQuery from "./position-table.dax?raw";

const connection = "cmsData";

export function quarterlyDealBlotterUnrealized() {
    return { connection, query: dealBlotterUnrealizedQuery };
}

export function quarterlyFinancialsApproval() {
    return { connection, query: financialsApprovalQuery };
}

export function quarterlyUnapprovedFinancials() {
    return { connection, query: unapprovedFinancialsQuery };
}

export function quarterlyPositionTable() {
    return { connection, query: positionTableQuery };
}
