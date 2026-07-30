import { useState } from "react";
import { PieChart, Smartphone, Wallet, Radar } from "lucide-react";
import { useCmsData } from "@/hooks/use-cms-data";
import { Header } from "@/components/cms/Header";
import { SideNav, type NavItemDef } from "@/components/cms/SideNav";
import { ExecutiveSummaryTab } from "@/components/cms/ExecutiveSummaryTab";
import { OverdueTab } from "@/components/cms/OverdueTab";
import { QuarterlyTab } from "@/components/cms/QuarterlyTab";
import { AnomalyBoard } from "@/components/cms/AnomalyBoard";
import { LoadingSkeleton, ErrorBanner } from "@/components/cms/DataStates";

type TabId = "executive" | "overdue" | "quarterly" | "anomaly";

const TAB_META: Record<TabId, { eyebrow: string; title: string }> = {
    executive: { eyebrow: "Overview", title: "Executive Summary" },
    overdue: { eyebrow: "Accountability", title: "Overdue Financials" },
    quarterly: { eyebrow: "Reporting Risk", title: "Financials Status by Fund" },
    anomaly: { eyebrow: "Data Quality", title: "Data Anomaly Board" },
};

function App() {
    const [activeTab, setActiveTab] = useState<TabId>("executive");
    const { isLoading, error, anomalies, companyFlags, overdue, quarterly, quarterIndex, setQuarterIndex, refetch } = useCmsData();

    const ready = anomalies && overdue && quarterly;
    const activeMeta = TAB_META[activeTab];

    const navItems: NavItemDef[] = [
        { id: "executive", label: "Executive Summary", icon: PieChart },
        { id: "overdue", label: "Overdue Financials", icon: Smartphone },
        { id: "quarterly", label: "Financials Status by Fund", icon: Wallet },
        { id: "anomaly", label: "Data Anomaly Board", icon: Radar },
    ];

    return (
        <div className="min-h-full flex bg-background">
            <SideNav items={navItems} activeItem={activeTab} onSelect={(id) => setActiveTab(id as TabId)} />

            <div className="flex-1 flex flex-col min-w-0">
                <Header eyebrow={activeMeta.eyebrow} title={activeMeta.title} onRefresh={refetch} isLoading={isLoading} />

                <main className="flex-1 overflow-auto">
                    <div className="max-w-[1400px] mx-auto px-xl py-xl space-y-l">
                        {error && !ready && <ErrorBanner message={error.message} />}
                        {!ready ? (
                            <LoadingSkeleton />
                        ) : (
                            <>
                                {activeTab === "executive" && (
                                    <ExecutiveSummaryTab overdue={overdue} />
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
