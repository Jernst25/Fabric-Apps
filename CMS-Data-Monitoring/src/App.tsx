import { useState } from "react";
import { useCmsData } from "@/hooks/use-cms-data";
import { QUARTERS } from "@/lib/cms/quarterly";
import { Header } from "@/components/cms/Header";
import { SideNav, type NavItemDef } from "@/components/cms/SideNav";
import { ExecutiveSummaryTab } from "@/components/cms/ExecutiveSummaryTab";
import { OverdueTab } from "@/components/cms/OverdueTab";
import { QuarterlyTab } from "@/components/cms/QuarterlyTab";
import { AnomalyBoard } from "@/components/cms/AnomalyBoard";
import { LoadingSkeleton, ErrorBanner } from "@/components/cms/DataStates";

type TabId = "executive" | "overdue" | "quarterly" | "anomaly";

function App() {
    const [activeTab, setActiveTab] = useState<TabId>("executive");
    const { isLoading, error, anomalies, companyFlags, overdue, quarterly, quarterIndex, setQuarterIndex, refetch } = useCmsData();

    const quarterLabel = QUARTERS[quarterIndex].label;
    const ready = anomalies && overdue && quarterly;

    const navItems: NavItemDef[] = [
        { id: "executive", label: "Executive Summary", badge: "Overview" },
        { id: "overdue", label: "Overdue Financials", badge: overdue ? String(overdue.totalDealsOverdue) : "…" },
        {
            id: "quarterly",
            label: "Quarterly FS by Fund",
            badge: quarterly && quarterly.dealsInQuarter > 0
                ? `${(((quarterly.dealsInQuarter - quarterly.notLoadedCount - quarterly.notApprovedCount) / quarterly.dealsInQuarter) * 100).toFixed(1)}%`
                : "…",
        },
        { id: "anomaly", label: "Data Anomaly Board", badge: anomalies ? String(anomalies.length) : "…" },
    ];

    return (
        <div className="min-h-full flex flex-col">
            <Header onRefresh={refetch} isLoading={isLoading} />

            <div className="flex-1 flex bg-background min-h-0">
                <SideNav items={navItems} activeItem={activeTab} onSelect={(id) => setActiveTab(id as TabId)} />

                <main className="flex-1 overflow-auto">
                    <div className="max-w-[1400px] mx-auto px-xl py-xl space-y-l">
                        {error && !ready && <ErrorBanner message={error.message} />}
                        {!ready ? (
                            <LoadingSkeleton />
                        ) : (
                            <>
                                {activeTab === "executive" && (
                                    <ExecutiveSummaryTab
                                        overdue={overdue}
                                        quarterly={quarterly}
                                        anomalies={anomalies}
                                        companyFlags={companyFlags}
                                        quarterLabel={quarterLabel}
                                    />
                                )}
                                {activeTab === "overdue" && <OverdueTab data={overdue} />}
                                {activeTab === "quarterly" && (
                                    <QuarterlyTab data={quarterly} quarterIndex={quarterIndex} setQuarterIndex={setQuarterIndex} />
                                )}
                                {activeTab === "anomaly" && <AnomalyBoard anomalies={anomalies} companyFlags={companyFlags} />}
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;
