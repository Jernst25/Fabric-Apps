import { esc, nameToEmail } from "./utils";

export type EmailStatus = "Not Loaded" | "Not Approved";

export interface EmailDealLine {
    deal: string;
    detail: string;
}

export interface EmailInput {
    person: string;
    status: EmailStatus;
    quarterLabel?: string;
    deals: EmailDealLine[];
}

const CLOSING = "If there are any issues or delays, please let me know so I can update the blotter accordingly.";

const INTROS: Record<EmailStatus, string> = {
    "Not Loaded": "I'm following up on the financial statements below that are still outstanding in CMS. Could you please upload these at your earliest convenience?",
    "Not Approved": "I'm writing to flag the financial statements below that have been loaded into CMS but are still pending your approval. Could you please work through these when you get a chance?",
};

export function emailSubject(status: EmailStatus, quarterLabel?: string): string {
    const prefix = quarterLabel ? `${quarterLabel} ` : "";
    return status === "Not Loaded"
        ? `${prefix}CMS Financial Statements — Upload Required`
        : `${prefix}CMS Financial Statements — Approval Required`;
}

export function firstNameOf(person: string): string {
    return person.trim().split(" ")[0] || person;
}

export function emailIntro(status: EmailStatus): string {
    return INTROS[status];
}

export function emailRecipient(person: string): string {
    return nameToEmail(person) ?? person;
}

export function buildEmailText(input: EmailInput): string {
    const firstName = firstNameOf(input.person);
    const lines = [
        `Hi ${firstName},`,
        "",
        emailIntro(input.status),
        "",
        ...input.deals.map((d) => `- ${d.deal}: ${d.detail}`),
        "",
        CLOSING,
    ];
    return lines.join("\n");
}

export function buildEmailHtml(input: EmailInput): string {
    const firstName = firstNameOf(input.person);
    const rows = input.deals
        .map((d) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #E3E7EF;">${esc(d.deal)}</td><td style="padding:6px 10px;border-bottom:1px solid #E3E7EF;color:#4B5768;">${esc(d.detail)}</td></tr>`)
        .join("");
    return `
    <div style="font-family:'Source Sans 3',Arial,sans-serif;color:#0C1B2E;font-size:14px;line-height:1.5;">
      <p>Hi ${esc(firstName)},</p>
      <p>${esc(emailIntro(input.status))}</p>
      <table style="border-collapse:collapse;width:100%;margin:12px 0;">
        <thead><tr>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #00457A;color:#00457A;">Deal</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #00457A;color:#00457A;">${input.quarterLabel ? "Status" : "Periods / Days Overdue"}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>${esc(CLOSING)}</p>
    </div>`;
}

export function buildMailtoUrl(input: EmailInput): string {
    const to = emailRecipient(input.person);
    const subject = emailSubject(input.status, input.quarterLabel);
    const body = buildEmailText(input);
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const HIG_DARK_BLUE = "#0C1B2E";
const HIG_BLUE = "#00457A";
const STATUS_BADGE: Record<EmailStatus, string> = {
    "Not Loaded": "#1D4ED8",
    "Not Approved": "#B42318",
};

/**
 * Renders the email as a 560pt-wide canvas at 2x scale for "copy as image".
 * Canvas height grows with the number of deal rows.
 */
export async function renderEmailCanvas(input: EmailInput): Promise<HTMLCanvasElement> {
    const scale = 2;
    const width = 560;
    const rowHeight = 26;
    const headerHeight = 100;
    const bodyPadding = 32;
    const introLines = 3;
    const height = headerHeight + bodyPadding * 2 + introLines * 20 + 40 + input.deals.length * rowHeight + 70;

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.scale(scale, scale);

    // Header
    ctx.fillStyle = HIG_DARK_BLUE;
    ctx.fillRect(0, 0, width, headerHeight);
    ctx.fillStyle = "#B1DCFF";
    ctx.font = "600 10px 'Source Sans 3', Arial, sans-serif";
    ctx.fillText("WHITEHORSE DIRECT LENDING · H.I.G. CAPITAL", 24, 28);
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 17px 'Source Sans 3', Arial, sans-serif";
    ctx.fillText("CMS Financial Statements — Action Required", 24, 54);

    const badgeText = input.status;
    ctx.font = "600 11px 'Source Sans 3', Arial, sans-serif";
    const badgeWidth = ctx.measureText(badgeText).width + 20;
    ctx.fillStyle = STATUS_BADGE[input.status];
    ctx.fillRect(24, 68, badgeWidth, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(badgeText, 34, 82);

    // Body
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, headerHeight, width, height - headerHeight);

    let y = headerHeight + bodyPadding;
    ctx.fillStyle = HIG_DARK_BLUE;
    ctx.font = "600 14px 'Source Sans 3', Arial, sans-serif";
    ctx.fillText(`Hi ${firstNameOf(input.person)},`, 24, y);
    y += 26;

    ctx.font = "14px 'Source Sans 3', Arial, sans-serif";
    ctx.fillStyle = "#2C2C2A";
    const intro = wrapText(ctx, emailIntro(input.status), width - 48);
    for (const line of intro) {
        ctx.fillText(line, 24, y);
        y += 20;
    }
    y += 10;

    // Deal table header
    ctx.strokeStyle = HIG_BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
    y += 18;
    ctx.font = "600 12px 'Source Sans 3', Arial, sans-serif";
    ctx.fillStyle = HIG_BLUE;
    ctx.fillText("Deal", 24, y);
    ctx.fillText(input.quarterLabel ? "Status" : "Periods / Days Overdue", 320, y);
    y += 12;

    ctx.font = "13px 'Source Sans 3', Arial, sans-serif";
    for (const d of input.deals) {
        y += rowHeight - 8;
        ctx.strokeStyle = "#E3E7EF";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(24, y + 6);
        ctx.lineTo(width - 24, y + 6);
        ctx.stroke();
        ctx.fillStyle = HIG_DARK_BLUE;
        ctx.fillText(truncateText(ctx, d.deal, 270), 24, y);
        ctx.fillStyle = "#4B5768";
        ctx.fillText(truncateText(ctx, d.detail, 200), 320, y);
    }

    y += 34;
    ctx.font = "14px 'Source Sans 3', Arial, sans-serif";
    ctx.fillStyle = "#2C2C2A";
    const closingLines = wrapText(ctx, CLOSING, width - 48);
    for (const line of closingLines) {
        ctx.fillText(line, 24, y);
        y += 20;
    }

    return canvas;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
        truncated = truncated.slice(0, -1);
    }
    return `${truncated}…`;
}

/** Copies the canvas as a PNG to the clipboard; falls back to a download if the Clipboard API is unavailable. */
export async function copyCanvasAsImage(canvas: HTMLCanvasElement): Promise<"copied" | "downloaded"> {
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Failed to render image");

    if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
        try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            return "copied";
        } catch {
            // fall through to download
        }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cms-email.png";
    a.click();
    URL.revokeObjectURL(url);
    return "downloaded";
}
