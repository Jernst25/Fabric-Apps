import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Plain-language summary of the rules implemented in lib/cms/overdue.ts.
 * Kept next to the numbers it explains so the two stay in sync — if the
 * thresholds, event handling, or window bounds there change, update this too.
 */
function Rule({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-xs sm:gap-s">
            <span className="text-200 font-semibold uppercase tracking-wide text-muted-foreground pt-xxs">
                {label}
            </span>
            <span className="text-300 text-foreground">{children}</span>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-m">
            <h3 className="text-400 font-semibold text-foreground">{title}</h3>
            <div className="space-y-m">{children}</div>
        </section>
    );
}

export function LogicInfoModal({ onClose }: { onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-foreground)]/40 p-l"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="logic-info-title"
                className="w-full max-w-[720px] max-h-[85vh] overflow-auto rounded-sm bg-card border border-border shadow-xl"
            >
                <div className="flex items-center justify-between px-xl py-l border-b border-border bg-primary text-primary-foreground rounded-t-sm">
                    <div>
                        <div className="text-200 uppercase tracking-wide opacity-80">Reference</div>
                        <div id="logic-info-title" className="text-500 font-semibold">
                            How these numbers are calculated
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-sm p-xs hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                    >
                        <X className="icon-size-300" />
                    </button>
                </div>

                <div className="p-xl space-y-xl">
                    <Section title="Overdue Financials">
                        <Rule label="Deals in scope">
                            All <strong>Unrealized</strong> deals, plus <strong>Realized</strong> deals that have a
                            Last Expected Financials Date. Deals marked Exclude From Reporting are still reconciled
                            and shown, just badged “Excluded”.
                        </Rule>
                        <Rule label="Reporting cadence">
                            Monthly or Quarterly, taken from the most recently approved filing. If a deal switched
                            cadence, earlier periods are graded against the cadence in force at the time.
                        </Rule>
                        <Rule label="Grace period">
                            A period is not overdue until its period end, plus the deal’s delay days (default 30
                            monthly / 45 quarterly), plus a 15-day buffer, have all passed.
                        </Rule>
                        <Rule label="Period window">
                            Starts at the First Expected Financials Date; if unset, the period after At Close; if
                            neither, the earliest filing on record. Ends at the most recent period past its grace,
                            capped at the Last Expected Financials Date for Realized deals. Limited to the last 12
                            periods.
                        </Rule>
                        <Rule label="Not Loaded">
                            An expected period with no statement filed at all. Attributed to the last named deal
                            professional, falling back to the last name in the deal team.
                        </Rule>
                        <Rule label="Not Approved">
                            A statement was filed but never approved. Attributed to the most recent approver on
                            record. At Close statements are flagged as soon as they are unapproved, with no grace
                            period, since they are a one-time closing deliverable rather than a recurring filing.
                        </Rule>
                        <Rule label="Filing types">
                            <strong>Periodic</strong> and <strong>At Exit</strong> statements satisfy their period.{" "}
                            <strong>At Close</strong> anchors the start of the window. <strong>Add-on</strong> and{" "}
                            <strong>Legacy At Close</strong> records are ignored everywhere: they are supplemental or
                            superseded entries, not a company’s recurring reporting.
                        </Rule>
                    </Section>

                    <Section title="No Financials">
                        <Rule label="What it means">
                            An Unrealized deal with no financial statements loaded at all, approved or otherwise.
                        </Rule>
                        <Rule label="Grace period">
                            A deal appears only once <strong>10 calendar days</strong> have passed since its At Close
                            date. Inside that window it is too new to have reported, not late, so it is held back
                            from the table entirely rather than shown and explained away. A deal with no At Close
                            date on record is shown, since there is no window to measure it against and an unknown
                            date should not quietly drop a deal off the review list.
                        </Rule>
                        <Rule label="At Close date">
                            Taken from the cashflows At Close table, matched to the deal on Investment Deal Full
                            Code. This is the deal’s closing date, not the Deal Blotter’s At Close column, which
                            tracks a different concept and is blank for the newest deals — precisely the ones the
                            grace period has to grade.
                        </Rule>
                        <Rule label="Why it is separate">
                            With no filings on record there is no cadence to establish and no period window to grade
                            against, so these deals cannot be counted as a number of overdue periods. They are listed
                            on their own rather than folded into the overdue totals.
                        </Rule>
                        <Rule label="In the KPIs">
                            <strong>New Deals with No Financials</strong> counts the rows in this table. They are also
                            shown beneath <strong>Deals Impacted</strong> as “+ N with no financials”, added
                            alongside that figure rather than into it, since they carry no overdue periods. Both
                            counts follow the page filters on either tab. Because this bucket carries no period or
                            region data and is always Unrealized, a Period, Region, or Realized filter empties it
                            rather than narrowing it.
                        </Rule>
                        <Rule label="Not included">
                            Realized deals. A realized deal with no Last Expected Financials Date is out of scope
                            entirely, and one that has already reported is handled by the overdue rules above.
                        </Rule>
                    </Section>
                </div>

                <div className="flex items-center justify-end px-xl py-l border-t border-border">
                    <button
                        onClick={onClose}
                        className="rounded-sm bg-primary text-primary-foreground px-l py-s text-300 font-medium hover:opacity-90"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
