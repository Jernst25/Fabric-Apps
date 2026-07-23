import type { QueryTable } from "@microsoft/fabric-app-data";

function stripSpecialChars(s: string): string {
    return s.replace(/[.[\]\\"']/g, "");
}

function bracketContent(s: string): string | null {
    const m = s.match(/\[([^\]]+)\]$/);
    return m ? m[1] : null;
}

/**
 * Converts row-major QueryTable data into plain objects, each field
 * registered under its raw column name, its bracket-stripped content
 * (e.g. "Financials[EntityName]" -> "EntityName"), and its special-char-
 * stripped form. This lets domain code read fields by simple name (e.g.
 * `row.EntityName`) without depending on whether the SDK returns aliased
 * or table-qualified column names.
 */
export function rowsToRecords(table: QueryTable): Record<string, unknown>[] {
    return table.rows.map((row) => {
        const rec: Record<string, unknown> = {};
        table.columns.forEach((col, i) => {
            const value = row[i];
            rec[col.name] = value;
            const bracket = bracketContent(col.name);
            if (bracket) rec[bracket] = value;
            rec[stripSpecialChars(col.name)] = value;
        });
        return rec;
    });
}

export function asString(v: unknown): string {
    return v == null ? "" : String(v);
}

export function asNumber(v: unknown): number | null {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isNaN(n) ? null : n;
}

/** Treats any of "-1"/"1"/"true"/"yes" (case-insensitive) or boolean true as truthy — encodings vary by source. */
export function truthy(v: unknown): boolean {
    if (v == null) return false;
    if (typeof v === "boolean") return v;
    const s = String(v).trim().toLowerCase();
    return s === "true" || s === "1" || s === "-1" || s === "yes";
}
