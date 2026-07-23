/** Position Table[Fund] codes for the Swiss-domiciled fund vehicles (see quarterly.ts's F2P for their display names). */
const SWISS_FUNDS = new Set(["SwHYS A", "SwHYS B", "SwHYSOFF"]);

/** Deal SRM IDs with a funded position in any Swiss-domiciled fund vehicle, derived from Position Table[Fund]. */
export function buildSwissHeldSet(rawPosition: Record<string, unknown>[]): Set<string> {
    const s = new Set<string>();
    for (const r of rawPosition) {
        const srmId = String(r["Investment Deal SRM ID"] ?? "").trim();
        const fund = String(r.Fund ?? "").trim();
        if (srmId && SWISS_FUNDS.has(fund)) s.add(srmId);
    }
    return s;
}

export const esc = (s: unknown): string =>
    String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

export const cmsUrl = (dealName: string): string =>
    "https://higprod.ivpcloud.com/d/assetmanagement#/dealDataDashboard?dealname=" +
    encodeURIComponent(dealName) +
    "&category=Financials&categoryId=System_FinancialStatements_Fixed&Entity_Type=Deal";

export const splitCamel = (s: string): string =>
    s ? s.replace(/([A-Z])/g, " $1").trim() : "";

export const nameToEmail = (n: string): string | null => {
    const p = n.trim().split(" ").filter(Boolean);
    if (p.length < 2) return null;
    return p[0][0].toLowerCase() + p[p.length - 1].toLowerCase() + "@whitehorse.com";
};

export const initials = (n: string): string =>
    n
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0] || "")
        .join("")
        .toUpperCase();

export const lastInTeam = (t: string): string => {
    const a = t.split(";").map((s) => s.trim()).filter(Boolean);
    return a[a.length - 1] || "";
};

export const secLastInTeam = (t: string): string => {
    const a = t.split(";").map((s) => s.trim()).filter(Boolean);
    return a.length >= 2 ? a[a.length - 2] : a[0] || "";
};

/**
 * Copies text to the clipboard, falling back to a hidden-textarea +
 * execCommand("copy") when the async Clipboard API is unavailable or denied
 * (common inside embedded/iframed contexts like the Fabric portal, where
 * clipboard-write permission isn't always granted). Returns whether the copy
 * actually succeeded — callers should not assume success just because the
 * promise resolved.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // fall through to the execCommand fallback
        }
    }

    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        return ok;
    } catch {
        return false;
    }
}
