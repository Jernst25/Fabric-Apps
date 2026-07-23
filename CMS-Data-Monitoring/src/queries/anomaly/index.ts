import financialsQuery from "./financials.dax?raw";
import covenantsQuery from "./covenants.dax?raw";
import dealBlotterQuery from "./deal-blotter.dax?raw";
import secMasterQuery from "./sec-master.dax?raw";

const connection = "cmsData";

export function anomalyFinancials() {
    return { connection, query: financialsQuery };
}

export function anomalyCovenants() {
    return { connection, query: covenantsQuery };
}

export function anomalyDealBlotter() {
    return { connection, query: dealBlotterQuery };
}

export function anomalySecMaster() {
    return { connection, query: secMasterQuery };
}
