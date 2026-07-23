import rosterQuery from "./roster.dax?raw";
import financialsPeriodsQuery from "./financials-periods.dax?raw";
import latestApproverQuery from "./latest-approver.dax?raw";
import unapprovedPeriodsQuery from "./unapproved-periods.dax?raw";

const connection = "cmsData";

export function overdueRoster() {
    return { connection, query: rosterQuery };
}

export function overdueFinancialsPeriods() {
    return { connection, query: financialsPeriodsQuery };
}

export function overdueLatestApprover() {
    return { connection, query: latestApproverQuery };
}

export function overdueUnapprovedPeriods() {
    return { connection, query: unapprovedPeriodsQuery };
}
