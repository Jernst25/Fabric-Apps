import { useEffect, useRef, useState } from "react";
import { X, Copy, Image as ImageIcon, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/cms/utils";
import {
    buildEmailHtml,
    buildEmailText,
    buildMailtoUrl,
    copyCanvasAsImage,
    emailRecipient,
    emailSubject,
    renderEmailCanvas,
    type EmailInput,
} from "@/lib/cms/email";

export function EmailModal({
    input,
    onClose,
    queueIndex,
    queueTotal,
    onNext,
}: {
    input: EmailInput;
    onClose: () => void;
    queueIndex?: number;
    queueTotal?: number;
    onNext?: () => void;
}) {
    const [copyState, setCopyState] = useState<string | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const to = emailRecipient(input.person);
    const subject = emailSubject(input.status, input.quarterLabel);
    const html = buildEmailHtml(input);

    async function handleCopyImage() {
        setCopyState("Rendering…");
        try {
            const canvas = await renderEmailCanvas(input);
            const result = await copyCanvasAsImage(canvas);
            setCopyState(result === "copied" ? "Image copied" : "Image downloaded");
        } catch {
            setCopyState("Failed to render image");
        }
        setTimeout(() => setCopyState(null), 2500);
    }

    async function handleCopyText() {
        const ok = await copyTextToClipboard(buildEmailText(input));
        setCopyState(ok ? "Text copied" : "Copy failed — try again");
        setTimeout(() => setCopyState(null), 2500);
    }

    function handleOpenMail() {
        window.location.href = buildMailtoUrl(input);
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-foreground)]/40 p-l"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                className="w-full max-w-[640px] max-h-[85vh] overflow-auto rounded-sm bg-card border border-border shadow-xl"
            >
                <div className="flex items-center justify-between px-xl py-l border-b border-border bg-primary text-primary-foreground rounded-t-sm">
                    <div>
                        <div className="text-200 uppercase tracking-wide opacity-80">
                            Draft follow-up email
                            {queueIndex != null && queueTotal != null && ` · ${queueIndex + 1} of ${queueTotal}`}
                        </div>
                        <div className="text-500 font-semibold">{input.person}</div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-sm p-xs hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                    >
                        <X className="icon-size-300" />
                    </button>
                </div>

                <div className="p-xl space-y-m">
                    <div className="grid grid-cols-[80px_1fr] gap-s text-300 items-center">
                        <span className="text-muted-foreground">To</span>
                        <span className="font-medium">{to}</span>
                        <span className="text-muted-foreground">Subject</span>
                        <span className="font-medium">{subject}</span>
                    </div>

                    <div
                        className="rounded-sm border border-border p-l bg-background"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-s px-xl py-l border-t border-border">
                    <button
                        onClick={onClose}
                        className="rounded-sm border border-border px-l py-s text-300 font-medium hover:bg-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCopyImage}
                        className={cn(
                            "inline-flex items-center gap-xs rounded-sm border border-border px-l py-s text-300 font-medium hover:bg-secondary",
                        )}
                    >
                        <ImageIcon className="icon-size-200" /> Copy as image
                    </button>
                    <button
                        onClick={handleCopyText}
                        className="inline-flex items-center gap-xs rounded-sm border border-border px-l py-s text-300 font-medium hover:bg-secondary"
                    >
                        <Copy className="icon-size-200" /> Copy text
                    </button>
                    <button
                        onClick={handleOpenMail}
                        className="inline-flex items-center gap-xs rounded-sm bg-primary text-primary-foreground px-l py-s text-300 font-medium hover:opacity-90"
                    >
                        <Mail className="icon-size-200" /> Open in Mail
                    </button>
                    {copyState && <span className="text-200 text-muted-foreground ml-auto">{copyState}</span>}
                    {onNext && queueIndex != null && queueTotal != null && queueIndex < queueTotal - 1 && (
                        <button
                            onClick={onNext}
                            className="ml-auto rounded-sm bg-secondary px-l py-s text-300 font-medium hover:bg-muted"
                        >
                            Skip to next →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
