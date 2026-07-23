---
name: cms-monitoring-system
description: >
  Recreate or update the CMS Monitoring System live artifact — a 3-tab live dashboard for
  WhiteHorse Direct Lending credit monitoring. Tabs: (1) CMS Data Anomaly Board with 15
  detection rules across Financials, Covenants, DealBlotter, and SecMasterDailyView;
  (2) Overdue CMS Financials grouped by associate/approver with AI-drafted follow-up emails;
  (3) Quarterly FS Status By Fund with per-quarter/fund filters and email drafting.
  All tabs lazy-load on first visit. Use when rebuilding, updating rules, adding tabs,
  or regenerating the artifact from scratch.
---

# CMS Monitoring System — App Specification

Complete specification for recreating the CMS Monitoring System live artifact
(`Cms Monitoring System` pinned artifact at `index.html`).

---

## Power BI Connection

| Field | Value |
|---|---|
| MCP tool | `mcp__aece91c7-eb6e-42ca-b984-875cec2580a3__execute_dax_query` |
| Workspace ID | `24737d38-e690-47bc-8dda-43af0fabc477` |
| Dataset ID | `142c724e-e250-4901-ac2f-a8c29503acd4` |
| Semantic model name | CMS Data - SQL - Dataflow |

### Response envelope — critical

The Power BI MCP returns a double-wrapped response:

```javascript
// structuredContent = { result: "<JSON string>" }
// NOT { results: [...] } directly

async function dax(q) {
  const r = await window.cowork.callMcpTool(TOOL, { dataset_id: DS, workspace_id: WS, query: q });
  if (r.isError) throw new Error(JSON.stringify(r.content).slice(0, 300));
  const raw   = r.structuredContent ?? JSON.parse(r.content[0].text);
  const inner = typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result;
  return inner?.results?.[0]?.tables?.[0]?.rows ?? [];
}
```

All DAX queries must be run **sequentially** (not in parallel) to avoid Power BI server contention and timeouts.

---

## App Architecture

Single-file HTML artifact. No build step, no external libraries. Pure vanilla JS with innerHTML rendering.

### Constants

```javascript
const DS   = '142c724e-e250-4901-ac2f-a8c29503acd4';
const WS   = '24737d38-e690-47bc-8dda-43af0fabc477';
const TOOL = 'mcp__aece91c7-eb6e-42ca-b984-875cec2580a3__execute_dax_query';
```

### Tab structure

Three tabs with lazy loading — each tab's data is fetched only on first visit:

```javascript
const TAB_LOADED = { anomaly: false, overdue: false, quarterly: false };

function showTab(name) {
  // toggle active classes
  if (!TAB_LOADED[name]) {
    TAB_LOADED[name] = true;
    if (name === 'anomaly')   loadAnomaly();
    else if (name === 'overdue')   loadOverdue();
    else if (name === 'quarterly') loadQuarterly();
  }
}
```

On init, `showTab('quarterly')` is called first — the Quarterly tab is the fastest and most stable.

### Tab order (left to right in nav)

1. Overdue CMS Financials (`tab-btn-overdue`)
2. Quarterly FS Status By Fund (`tab-btn-quarterly`)
3. CMS Data Anomaly Board (`tab-btn-anomaly`)

### Brand / styling

| Token | Value |
|---|---|
| Primary blue | `#0C447C` |
| Background cream | `#F8F7F3` |
| Alert amber | `#FFF7ED` / `#FCD34D` |
| Not Loaded blue | `#378ADD` / `#DBEAFE` |
| Not Approved red | `#D85A30` / `#FAECE7` |
| Body text | `#2C2C2A` |
| Muted text | `#888780` |
| Border | `#E8E6DF` |
| Font | Arial, sans-serif |

Header eyebrow: `WhiteHorse Direct Lending · H.I.G. Capital`

---

## Shared Utilities

```javascript
const esc       = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cmsUrl    = d => 'https://higprod.ivpcloud.com/d/assetmanagement#/dealDataDashboard?dealname=' + encodeURIComponent(d) + '&category=Financials&categoryId=System_FinancialStatements_Fixed&Entity_Type=Deal';
const splitCamel = s => s ? s.replace(/([A-Z])/g,' $1').trim() : '';
const nameToEmail = n => { const p=n.trim().split(' ').filter(Boolean); return p.length<2?null:p[0][0].toLowerCase()+p[p.length-1].toLowerCase()+'@whitehorse.com'; };
const initials  = n => n.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const lastInTeam   = t => { const a=t.split(';').map(s=>s.trim()).filter(Boolean); return a[a.length-1]||''; };
const secLastInTeam = t => { const a=t.split(';').map(s=>s.trim()).filter(Boolean); return a.length>=2?a[a.length-2]:a[0]||''; };
```

**Person grouping rules:**
- Not Loaded items: responsible person = **last** person in the semicolon-delimited `DealTeam` string
- Not Approved items: responsible person = approver from `Financials[approverName]` lookup, falling back to **second-to-last** in team string

**Email address derivation:** `firstInitial + lastName + @whitehorse.com` (all lowercase)

---

## Tab 1: CMS Data Anomaly Board

### Data sources (4 sequential DAX queries)

#### Query A — Financials (rules 1–10)

```dax
EVALUATE SELECTCOLUMNS(
  CALCULATETABLE(
    Financials,
    Financials[Level0] IN {
      "TTM Adj EBITDA","TTM WH Adj EBITDA","Revenue",
      "Net Leverage At Face","Net Leverage Through Class At Face",
      "Interest Coverage","FCCR","EV Multiple"
    }
  ),
  "EntityName",  Financials[EntityName],
  "Period",      Financials[Period],
  "DateKey",     Financials[_DateKey],
  "PeriodType",  Financials[PeriodType],
  "Event",       Financials[Event],
  "Level0",      Financials[Level0],
  "Value",       Financials[Value]
)
```

Row key format: `r['[EntityName]']`, `r['[Period]']`, `r['[DateKey]']`, `r['[PeriodType]']`, `r['[Event]']`, `r['[Level0]']`, `r['[Value]']`

#### Query B — Covenants (rules 11–12)

```dax
EVALUATE SELECTCOLUMNS(Covenants,
  "EntityName",  Covenants[EntityName],
  "Period",      Covenants[Period],
  "HIGCovenant", Covenants[HIGCovenant],
  "ValueType",   Covenants[ValueType],
  "Value",       Covenants[Value]
)
```

Row key format: `r['[EntityName]']`, `r['[Period]']`, `r['[HIGCovenant]']`, `r['[ValueType]']`, `r['[Value]']`

#### Query C — DealBlotter (rules 13–15)

```dax
EVALUATE SELECTCOLUMNS(DealBlotter,
  "EntityName",             DealBlotter[EntityName],
  "Comment",                DealBlotter[Comment],
  "LastModifiedDate",       DealBlotter[LastModifiedDate],
  "RealizedUnrealizedStatus", DealBlotter[RealizedUnrealizedStatus],
  "ExcludeFromReporting",   DealBlotter[ExcludeFromReporting],
  "EntityNotInFinancials",  DealBlotter[EntityNotInFinancials],
  "InvestmentDealFullCode", DealBlotter[InvestmentDeal-Issuer.Investment Deal full Code]
)
```

Row key format: `r['[EntityName]']`, `r['[Comment]']`, `r['[LastModifiedDate]']`, `r['[RealizedUnrealizedStatus]']`, `r['[ExcludeFromReporting]']`, `r['[EntityNotInFinancials]']`, `r['[InvestmentDealFullCode]']`

#### Query D — SecMasterDailyView (rule 15)

```dax
EVALUATE SELECTCOLUMNS(
  FILTER(SecMasterDailyView, SecMasterDailyView[Has Position] = TRUE()),
  "SecurityID",   SecMasterDailyView[Security ID],
  "SecurityName", SecMasterDailyView[Security Name],
  "DealCode",     SecMasterDailyView[Investment Deal Full Code],
  "IsInactive",   SecMasterDailyView[Is Inactive Security]
)
```

Row key format: `r['[SecurityID]']`, `r['[SecurityName]']`, `r['[DealCode]']`, `r['[IsInactive]']`

---

### 15 Anomaly Detection Rules

Monitored metrics set:
```javascript
const METRICS = ["TTM Adj EBITDA","TTM WH Adj EBITDA","Revenue",
                 "Net Leverage At Face","Net Leverage Through Class At Face",
                 "Interest Coverage","FCCR","EV Multiple"];
const EBITDA  = new Set(["TTM Adj EBITDA","TTM WH Adj EBITDA"]);
```

All rules operate on **Quarterly** PeriodType rows only for rules 1–10, except Rule 9 which also uses At Close rows.

**Indexing structures:**
- `byEM[entity][level0]` → array of `{p, dk, v}` sorted by `dk` ASC (Quarterly rows only)
- `byEP[entity][period]` → Set of level0 metrics present (Quarterly rows only)
- `acByEM[entity][level0]` → first At Close value (for Rule 9)

#### Rule 1: Spike/Drop (Severity: Low)

EBITDA metrics: absolute change > 50 from trailing 3-period avg.
All other metrics: relative change > 50% from trailing 3-period avg.

```javascript
const isE = EBITDA.has(l0);
const fire = isE ? Math.abs(c.v - avg) > 50 : Math.abs((c.v - avg) / avg) > 0.5;
```

#### Rule 2: Sign Flip (Severity: High)

`sign(current) !== sign(prior)`. Exception: skip if EBITDA metric and the prior two periods show a declining trend (indicating gradual deterioration, not a data error).

#### Rule 3: Zero/Null (Severity: High)

Current value is `null` or `0`.

#### Rule 4: Coverage Gap (Severity: High)

A metric in `METRICS` is missing from a period where at least one other metric IS reported for the same entity.

#### Rule 5: Leverage Hierarchy Breach (Severity: High)

`Net Leverage Through Class At Face` (rounded to 2dp) > `Net Leverage At Face` (rounded to 2dp) in the same period. Physically impossible: through-class leverage must be ≥ at-face.

#### Rule 6: Stale/Duplicate — Interest Coverage only (Severity: Medium)

Interest Coverage unchanged for 3+ consecutive periods.

#### Rule 7: Missing Period (Severity: High)

Gap between consecutive date keys exceeds 1.8× the median gap for that entity/metric series. (Median gap inferred from the series itself — handles both monthly and quarterly cadences.)

#### Rule 8: Coverage Inversion (Severity: High)

`Interest Coverage ≤ FCCR` in the same period. FCCR (fixed charge coverage) is always ≤ IC by definition.

#### Rule 9: At Close vs Periodic Gap (Severity: Medium)

First periodic value differs from At Close value by more than 30%. Fires only if both values are non-null and non-zero.

#### Rule 10: EV Multiple Inconsistency (Severity: Medium)

EV Multiple changes more than 20% period-over-period.

#### Rule 11: No Covenant Reported Value (Severity: High)

An entity/period pair exists in the Quarterly financials universe but has no `Covenants[ValueType] = "Reported"` row with a non-null/non-zero value.

#### Rule 12: No Covenant Threshold Value (Severity: Medium)

A `(entity, period, HIGCovenant)` combination in the Covenants table has no `ValueType = "Threshold"` row with a non-null/non-zero value.

#### Rule 13: Stale Blotter Comments (Severity: Low)

`DealBlotter[Comment]` not updated in 90+ days, for unrealized, non-excluded deals.
Uses `LastModifiedDate` as proxy (known limitation — document in output).

#### Rule 14: New Deals Missing Financials (Severity: High)

`DealBlotter[EntityNotInFinancials]` flag is truthy AND `ExcludeFromReporting !== '-1'`.

#### Rule 15: Security ID/Name Not Populated (Severity: Low)

Active security (not inactive, not realized) missing `SecurityID` or `SecurityName`.

---

### Deduplication and sort

Dedup on `(company, type, period, metric)`. Sort: severity (High → Medium → Low), then company name alphabetically.

```javascript
const SORD = { High: 0, Medium: 1, Low: 2 };
```

---

### Anomaly Board UI

KPI cards: Total anomalies | High | Medium | Low
Filters: severity dropdown, rule type dropdown, company text input
Table columns: Severity | Company | Metric | Period | Rule | Description

Severity badges:
- `sev-H`: `background:#FEE2E2; color:#7F1D1D`
- `sev-M`: `background:#FEF3C7; color:#78350F`
- `sev-L`: `background:#DCFCE7; color:#14532D`

---

## Tab 2: Overdue CMS Financials

### Data sources (2 sequential DAX queries)

#### Query A — Missing Periods FS

```dax
EVALUATE SUMMARIZECOLUMNS(
  'Missing Periods FS'[Deal Team Investment Professionals],
  'Missing Periods FS'[Deal Name],
  'Missing Periods FS'[Business],
  'Missing Periods FS'[Status],
  'Missing Periods FS'[Missing Income Statement],
  'Missing Periods FS'[# Of Days Overdue],
  'Missing Periods FS'[Comment],
  'Missing Periods FS'[ExcludeFromReporting],
  'Missing Periods FS'[Is Swiss Held?]
)
```

Row key format: `r["Missing Periods FS[Deal Team Investment Professionals]"]`, `r["Missing Periods FS[Deal Name]"]`, `r["Missing Periods FS[Business]"]`, `r["Missing Periods FS[Status]"]`, `r["Missing Periods FS[Missing Income Statement]"]`, `r["Missing Periods FS[# Of Days Overdue]"]`, `r["Missing Periods FS[Comment]"]`, `r["Missing Periods FS[ExcludeFromReporting]"]`, `r["Missing Periods FS[Is Swiss Held?]"]`

Exclude rows where `ExcludeFromReporting === '1'`.

#### Query B — Approver lookup

```dax
EVALUATE SUMMARIZECOLUMNS(
  Financials[EntityName],
  "LatestApprover", CALCULATE(MAXX(TOPN(1, Financials, Financials[approvalDate], DESC), Financials[approverName]))
)
```

Row key format: `r["Financials[EntityName]"]`, `r["[LatestApprover]"]`

The approver value is camelCase (e.g., `"MatthewBurke"`). Apply `splitCamel()` to get display name.

---

### Overdue data model

```javascript
{
  team:    // semicolon-delimited string of investment professionals
  deal:    // deal name
  biz:     // "WhiteHorse DL US" | "WhiteHorse DL Europe"
  status:  // "Not Loaded" | "Not Approved"
  period:  // "Jul-25" | "Aug-25" | ... (period label, null if no missing period)
  days:    // integer days overdue
  comment: // blotter comment or null
  swiss:   // "Yes" | "No"
}
```

---

### Grouping logic

Groups are built separately for Not Loaded and Not Approved:

```javascript
// Not Loaded: group by last person in team string
const person = lastInTeam(row.team);

// Not Approved: group by approver from lookup, fall back to second-to-last in team
const person = OD_APPROV[row.deal] || secLastInTeam(row.team);
```

Within each group, deals are sorted by `maxDays` DESC. Periods within each deal are deduplicated and sorted by `PERIOD_ORDER` index:

```javascript
const PERIOD_ORDER = ["Jul-25","Aug-25","Sep-25","Oct-25","Nov-25","Dec-25",
                      "Jan-26","Feb-26","Mar-26","Apr-26","May-26","Jun-26"];
```

Periods at index ≤ 3 (Jul-25 through Oct-25) render as critical (red pills, `pill-crit` class).

---

### Alert banner

Deals with non-null `comment` field surface in a gold alert banner: "Hold emails — N deals with active blotter comments". Lists each deal name, responsible person, and comment text. Prevents accidental email outreach before blotter issues are resolved.

---

### Filters

- Status: All | Not Approved | Not Loaded | WH DL US | WH DL Europe
- Swiss held toggle

---

### UI structure

- KPI grid: Total deals overdue | Not Loaded periods | Not Approved periods | Max days overdue
- Chart grid: horizontal bar charts (Not Loaded by associate, Not Approved by approver)
- Two collapsible group tables: Not Loaded and Not Approved
- Group row: avatar (initials), person name, deal count, max days, email draft button, period count badge, collapse chevron
- Deal row (indented): CMS link, business label, Swiss badge, period pills

---

### Email drafting — Overdue tab

Opens a modal with AI-generated intro via `window.cowork.askClaude()`.

Prompt template:
> "Write 1-2 sentences only — a professional intro for an email from Juana Ernst asking [firstName] at WhiteHorse Capital to [upload outstanding financial statements into CMS / approve pending financial statements in CMS]. No greeting, no deal list, no sign-off. Direct and factual tone."

Default fallback intros:
- Not Loaded: "I'm following up on the financial statements below that are still outstanding in CMS. Could you please upload these at your earliest convenience?"
- Not Approved: "I'm writing to flag the financial statements below that have been loaded into CMS but are still pending your approval. Could you please work through these when you get a chance?"

Closing (both types): "If there are any issues or delays, please let me know so I can update the blotter accordingly."

Sign-off: `Juana Ernst / Credit Monitoring · H.I.G. Capital`

Email contains: HTML-rendered version (for "Copy as image"), plain-text version (for "Open in Mail" mailto link), and canvas-rendered PNG copy capability.

---

## Tab 3: Quarterly FS Status By Fund

### Data sources (4 sequential DAX queries)

Quarters covered:

```javascript
const QUARTERS = [
  { label:'Q3 2025', mo:'Sep 2025', qp:'Q3 2025', eL:'Sep-25', eD:'2025-09-30' },
  { label:'Q4 2025', mo:'Dec 2025', qp:'Q4 2025', eL:'Dec-25', eD:'2025-12-31' },
  { label:'Q1 2026', mo:'Mar 2026', qp:'Q1 2026', eL:'Mar-26', eD:'2026-03-31' },
  { label:'Q2 2026', mo:'Jun 2026', qp:'Q2 2026', eL:'Jun-26', eD:'2026-06-30' },
];
```

Default selected quarter: index 3 (Q2 2026).

#### Query A — DealBlotter (unrealized only)

```dax
EVALUATE CALCULATETABLE(
  SUMMARIZECOLUMNS(
    'DealBlotter'[EntityName],
    'DealBlotter'[DealSrmId],
    'DealBlotter'[DealTeam],
    'DealBlotter'[ProfessionalTeam],
    'DealBlotter'[Comment],
    'DealBlotter'[ExcludeFromReporting],
    'DealBlotter'[AtCloseDate]
  ),
  'DealBlotter'[Realized/Unrealized] = "Unrealized"
)
ORDER BY 'DealBlotter'[EntityName]
```

Row keys: `r["DealBlotter[EntityName]"]`, `r["DealBlotter[DealSrmId]"]`, `r["DealBlotter[DealTeam]"]`, `r["DealBlotter[Comment]"]`, `r["DealBlotter[ExcludeFromReporting]"]`, `r["DealBlotter[AtCloseDate]"]`

#### Query B — Financials approval status (quarterly periods only)

```dax
EVALUATE CALCULATETABLE(
  SUMMARIZECOLUMNS(
    Financials[EntityName],
    Financials[Period],
    Financials[Approved],
    "LatestApprover", CALCULATE(MAXX(TOPN(1, Financials, Financials[approvalDate], DESC), Financials[approverName]))
  ),
  Financials[Period] IN {
    "Sep 2025","Dec 2025","Mar 2026","Jun 2026",
    "Q3 2025","Q4 2025","Q1 2026","Q2 2026"
  }
)
```

Row keys: `r["Financials[EntityName]"]`, `r["Financials[Period]"]`, `r["Financials[Approved]"]`, `r["[LatestApprover]"]`

A period/entity is approved if `Financials[Approved] === 'Approved'`. The finMap lookup uses `entity + '||' + period`.

#### Query C — Unapproved Financials (Not Approved status)

```dax
EVALUATE SUMMARIZECOLUMNS(
  'Unapproved Financials - Last 12 Periods'[EntityName],
  'Unapproved Financials - Last 12 Periods'[AsOfDate]
)
```

Row keys: `r["Unapproved Financials - Last 12 Periods[EntityName]"]`, `r["Unapproved Financials - Last 12 Periods[AsOfDate]"]`

Maps `AsOfDate` (ISO date string) to quarter-end label using:
```javascript
const QEND = {
  '2025-09-30': 'Sep-25', '2025-12-31': 'Dec-25',
  '2026-03-31': 'Mar-26', '2026-06-30': 'Jun-26'
};
```

#### Query D — Position Table (fund membership)

```dax
EVALUATE CALCULATETABLE(
  SUMMARIZECOLUMNS(
    'Position Table'[Investment Deal SRM ID],
    'Position Table'[Fund]
  ),
  TREATAS(
    CALCULATETABLE(
      SUMMARIZECOLUMNS('DealBlotter'[DealSrmId]),
      'DealBlotter'[Realized/Unrealized] = "Unrealized"
    ),
    'Position Table'[Investment Deal SRM ID]
  ),
  'Position Table'[Funded Qty] > 0
)
```

Row keys: `r["Position Table[Investment Deal SRM ID]"]`, `r["Position Table[Fund]"]`

This query is wrapped in try/catch — if it fails, `posRows = []` and no fund tags are shown.

---

### Fund → Display name mapping (F2P)

The raw `Fund` values from the Position Table are mapped to shorter display names for the fund pill UI:

```javascript
const F2P = {
  "ABF SMA":"ABF", "BCSSS":"BCSSS", "CEPB":"CEPB", "DLF":"DLF", "DLF Offs":"DLF Offs",
  "DLOFF20":"DLOFF20", "DLON20":"DLON20", "FSBA":"FSBA", "GCOF":"GCOF", "HELI2025":"HELI2025",
  "HSBC":"HSBC", "HTAMMEU":"HTAMMEU", "HTAMMUS":"HTAMMUS", "MPS":"MPS", "SSGCC":"SSGCC",
  "WHF STRS":"STRS JV", "SwHYS A":"Swiss On", "SwHYS B":"Swiss On", "SwHYSOFF":"SwissOff",
  "TMRS":"TMRS", "TCRS":"TriStar", "VRS SMA":"VRS SMA", "WHF Inc.":"WHF Inc.",
  "WHMM":"WHMM", "WHMMC":"WHMMC", "WHMMFH":"WHMMFINH", "WHMMK":"WHMMK", "WHMML":"WHMML",
  "WHMMTA":"WHMMT", "WHMMTB":"WHMMT", "WHMMU":"WHMMU",
  "WHPL2024":"WHPL OFF", "WHPL2025":"WHPL OFF", "WHPL2026":"WHPL OFF", "WHPL2027":"WHPL OFF",
  "WHPL2028":"WHPL OFF", "WHPL2029":"WHPL OFF", "WHPL2030":"WHPL OFF",
  "WHPL25H1":"WHPL OFF", "WHPL26H1":"WHPL OFF", "WHPL27H1":"WHPL OFF",
  "WHPL28H1":"WHPL OFF", "WHPL29H1":"WHPL OFF",
  "WPLC2224":"WHPL OFF", "WPLC2225":"WHPL OFF", "WPLC2226":"WHPL OFF", "WPLC2227":"WHPL OFF",
  "WPLC2228":"WHPL OFF", "WPLC2229":"WHPL OFF", "WPLC2230":"WHPL OFF",
  "WHPL":"WHPLON", "WHPLH1":"WHPLON", "WPLC22ON":"WHPLON",
  "TERRA":"WHPLTERA", "TERRAC":"WHPLTERA", "WHPLUBS":"WHPLUBS",
  "4MBL":"WHTAXBLK", "ASBL":"WHTAXBLK", "BlueWave":"WHTAXBLK", "HMFH":"WHTAXBLK",
  "NEXTK":"WHTAXBLK", "QEBL":"WHTAXBLK", "WEST":"WHTAXBLK",
  "WHYOS":"WHYOS", "WHYOSCO":"WHYOSCO", "PARTS":"PARTS",
};
```

Fund color palette (background, text) for fund pills:

```javascript
const FCLR = {
  "WHPLON":    ["#EFF6FF","#1D4ED8"],  "WHPL OFF": ["#DBEAFE","#1E40AF"],
  "WHPLUBS":   ["#E0E7FF","#3730A3"],  "WHPLTERA": ["#EDE9FE","#5B21B6"],
  "WHMM":      ["#F0FDF4","#166534"],  "WHMML":    ["#DCFCE7","#15803D"],
  "WHMMU":     ["#D1FAE5","#065F46"],  "WHMMT":    ["#ECFDF5","#047857"],
  "Swiss On":  ["#FFF7ED","#9A3412"],  "SwissOff": ["#FFEDD5","#7C2D12"],
  "TMRS":      ["#FEF2F2","#991B1B"],  "TriStar":  ["#FEF2F2","#7F1D1D"],
  "SSGCC":     ["#FAF5FF","#6B21A8"],  "STRS JV":  ["#FDF4FF","#701A75"],
  "WHF Inc.":  ["#F1F5F9","#334155"],  "WHTAXBLK": ["#F9FAFB","#6B7280"],
};
```

---

### Deal status logic

```javascript
function qfStatus(deal, quarter, finMap, unapprSet) {
  if (deal.exclude === '-1')         return 'excluded';   // hidden from all views
  if (deal.atClose > quarter.eD)     return 'skip';       // deal not yet active at quarter-end
  if (finMap[deal.entity + '||' + quarter.mo] ||
      finMap[deal.entity + '||' + quarter.qp]) return 'approved';
  if (unapprSet.has(deal.entity + '||' + quarter.eL)) return 'not_approved';
  return 'not_loaded';
}
```

`finMap` key: `entity + '||' + period` (period can be either `"Mar 2026"` or `"Q1 2026"` format).

---

### Quarterly UI

- Quarter selector buttons (Q3 2025, Q4 2025, Q1 2026, Q2 2026)
- Status filter: All | Not Loaded | Not Approved
- Fund pill filter: All funds + individual fund names derived from live `posMap` data
- KPI grid: Deals in quarter | Not Loaded | Not Approved | Quarter-end date
- Charts: horizontal bars (Not Loaded by associate, Not Approved by approver)
- Two collapsible group tables: Not Loaded and Not Approved
- Deal rows show: deal name (CMS link), fund tags (colored pills), status badge

---

### Email drafting — Quarterly tab

Same modal as Overdue tab. Emails are cached per `gKey` (group key = type + person + quarter label) to avoid re-drafting on repeated opens (`QF_EC` cache object).

Prompt template:
> "Write 1-2 sentences only — a professional intro for an email from Juana Ernst asking [firstName] at WhiteHorse Capital to [upload Q2 2026 financial statements into CMS / approve Q2 2026 financial statements in CMS]. No greeting, no deal list, no sign-off. Direct and factual tone."

---

## Email Modal (Shared)

Single modal instance reused across all tabs. Fields:
- To: derived from `nameToEmail(person)` or person name as fallback
- Subject: pre-populated, read-only
- Body: AI-generated HTML preview + hidden plain-text textarea

Actions:
- **Cancel**: closes modal
- **Copy as image**: renders a 560×dynamic-height canvas at 2× scale with H.I.G. header, deal table, greeting, and sign-off; copies PNG to clipboard (or downloads if Clipboard API unavailable)
- **Copy text**: copies plain-text version to clipboard
- **Open in Mail**: generates `mailto:` URI and clicks it

Canvas image structure:
- Header: `#0C447C` background, eyebrow "WHITEHORSE DIRECT LENDING · H.I.G. CAPITAL", title "CMS Financial Statements — Action Required", colored badge (Not Loaded / Not Approved)
- Body: white background, `Hi [firstName],` greeting, intro paragraph, deal table (Deal / periods or quarter / days overdue or status), closing paragraph, sign-off

---

## Artifact Metadata

```json
{
  "name": "Cms Monitoring System",
  "schemaVersion": 1,
  "description": "CMS Data Monitoring System — 3-tab live dashboard...",
  "mcpTools": ["mcp__aece91c7-eb6e-42ca-b984-875cec2580a3__execute_dax_query"],
  "mcpServerNames": ["Credit Data Power BI MCP"]
}
```

---

## Known Constraints

- **Anomaly tab query size**: The `Financials` table queried for anomaly detection can be large. The query uses `CALCULATETABLE` with a metric filter to reduce row count. If timeouts occur, scope to a shorter `_DateKey` range.
- **Parallel query contention**: All DAX queries run sequentially. Parallel execution causes Power BI server contention and timeouts.
- **Approver data quality**: Not Approved grouping uses `approverName` from the `Financials` table as a proxy. The correct source would be CMS User Management's `ipsfsapprover` scope — update the logic when that export is available.
- **Stale Blotter Comments (Rule 13)**: Uses `LastModifiedDate` as a proxy for comment staleness. This is a known limitation.
- **Position Table query**: Wrapped in try/catch; silently skips if it fails. Fund tags will be absent but the tab still renders correctly.
- **Email address format**: Derived as `firstInitial + lastName + @whitehorse.com`. If a person's email doesn't match this pattern, the "To" field will be incorrect and must be corrected before sending.

---

## Rebuild Checklist

When recreating this artifact:

1. Set MCP tool, workspace ID, and dataset ID constants at top of script
2. Implement the `dax()` helper with the double-envelope unwrap
3. Build tab switching with lazy load flags
4. Tab 1 (Anomaly): 4 queries → `detectAnomalies()` → `renderAnomaly()` with filter controls
5. Tab 2 (Overdue): 2 queries → parse/group → `renderOverdue()` with collapsible groups + alert banner
6. Tab 3 (Quarterly): 4 queries → compute status → `renderQF()` with quarter/fund/status filters
7. Shared email modal with `askClaude()` AI intro, HTML builder, canvas copy, and mailto fallback
8. Initialize with `showTab('quarterly')` as the default landing tab
