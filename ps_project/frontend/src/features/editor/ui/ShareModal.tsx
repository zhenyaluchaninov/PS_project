"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import QRCode from "qrcode";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/features/ui-core/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/features/ui-core/primitives/dialog";
import { toastInfo, toastSuccess, toastWarning } from "@/features/ui-core/toast";
import { cn } from "@/lib/utils";

type ShareModalProps = {
  editSlug: string;
  viewSlug?: string | null;
  trigger?: ReactNode;
};

type ShareLinkSectionProps = {
  title: string;
  description: string;
  value: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onCopy: (value: string, inputRef: React.RefObject<HTMLInputElement>) => void;
  onOpen: (value: string) => void;
  disabled?: boolean;
};

const buildAbsoluteUrl = (origin: string, path: string) => {
  if (!path) return "";
  if (!origin) return path;
  try {
    return new URL(path, origin).toString();
  } catch {
    return path;
  }
};

const ShareLinkSection = ({
  title,
  description,
  value,
  inputRef,
  onCopy,
  onOpen,
  disabled = false,
}: ShareLinkSectionProps) => (
  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
        <p className="text-xs text-[var(--muted)]">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onCopy(value, inputRef)}
          disabled={disabled}
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onOpen(value)}
          disabled={disabled}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Open
        </Button>
      </div>
    </div>
    <input
      ref={inputRef}
      value={value}
      readOnly
      placeholder="Unavailable"
      className="mt-3 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
    />
  </div>
);

export function ShareModal({
  editSlug,
  viewSlug,
  trigger,
}: ShareModalProps) {
  const [open, setOpen] = useState(false);
  const [qrTarget, setQrTarget] = useState<"view" | "edit">("view");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const viewInputRef = useRef<HTMLInputElement>(null);

  const origin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    []
  );
  const editPath = `/redigera/${editSlug}`;
  const viewPath = viewSlug ? `/spela/${viewSlug}` : "";
  const editUrl = useMemo(
    () => buildAbsoluteUrl(origin, editPath),
    [editPath, origin]
  );
  const viewUrl = useMemo(
    () => buildAbsoluteUrl(origin, viewPath),
    [origin, viewPath]
  );
  const viewEnabled = Boolean(viewUrl);

  const qrValue = qrTarget === "edit" || !viewEnabled ? editUrl : viewUrl;

  useEffect(() => {
    if (qrTarget === "view" && !viewEnabled) {
      setQrTarget("edit");
    }
  }, [qrTarget, viewEnabled]);

  useEffect(() => {
    if (!open) return;
    if (!qrValue) {
      setQrDataUrl(null);
      setQrError("No link available.");
      return;
    }
    let active = true;
    setQrError(null);
    QRCode.toDataURL(qrValue, { width: 220, margin: 1 })
      .then((url) => {
        if (!active) return;
        setQrDataUrl(url);
      })
      .catch(() => {
        if (!active) return;
        setQrDataUrl(null);
        setQrError("Failed to generate QR code.");
      });
    return () => {
      active = false;
    };
  }, [open, qrValue]);

  const handleCopy = useCallback(
    async (value: string, inputRef: React.RefObject<HTMLInputElement>) => {
      if (!value) {
        toastWarning("Copy failed", "Link is unavailable.");
        return;
      }
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
          toastSuccess("Copied", "Link copied to clipboard.");
          return;
        }
      } catch {
        // Fall back to manual copy.
      }
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
      toastInfo("Copy link", "Press Ctrl+C to copy the link.");
    },
    []
  );

  const handleOpen = useCallback((value: string) => {
    if (!value) return;
    window.open(value, "_blank", "noopener,noreferrer");
  }, []);

  const triggerNode = trigger ?? (
    <Button size="sm" variant="secondary">
      <Share2 className="h-4 w-4" aria-hidden="true" />
      Share
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
          <DialogDescription>
            Copy links and share a QR code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ShareLinkSection
            title="Edit link"
            description="Open the editor for this adventure."
            value={editUrl}
            inputRef={editInputRef}
            onCopy={handleCopy}
            onOpen={handleOpen}
            disabled={!editUrl}
          />
          <ShareLinkSection
            title="View link"
            description="Open the public player."
            value={viewUrl}
            inputRef={viewInputRef}
            onCopy={handleCopy}
            onOpen={handleOpen}
            disabled={!viewUrl}
          />

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text)]">QR code</p>
                <p className="text-xs text-[var(--muted)]">
                  Scan to open the link on mobile.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={qrTarget === "view" ? "secondary" : "ghost"}
                  onClick={() => setQrTarget("view")}
                  disabled={!viewEnabled}
                >
                  View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={qrTarget === "edit" ? "secondary" : "ghost"}
                  onClick={() => setQrTarget("edit")}
                >
                  Edit
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div
                className={cn(
                  "flex h-40 w-40 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)]"
                )}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR code"
                    className="h-36 w-36 rounded-lg bg-[var(--bg)]"
                  />
                ) : (
                  <p className="text-xs text-[var(--muted)]">
                    {qrError ?? "Generating..."}
                  </p>
                )}
              </div>
              <div className="min-w-[220px] space-y-2 text-xs text-[var(--muted)]">
                <p className="text-[var(--text-secondary)]">
                  Target: {qrTarget === "edit" ? "Edit link" : "View link"}
                </p>
                <p className="break-all">{qrValue || "No link available."}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
