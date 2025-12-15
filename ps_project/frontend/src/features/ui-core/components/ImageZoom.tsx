"use client";

import Image from "next/image";
import { useState } from "react";
import { ZoomIn } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/features/ui-core/primitives";
import { cn } from "@/lib/utils";

type ImageZoomProps = {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  imageClassName?: string;
  width?: number;
  height?: number;
};

export function ImageZoom({
  src,
  alt,
  caption,
  className,
  imageClassName,
  width = 1200,
  height = 800,
}: ImageZoomProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/80 shadow-[0_20px_80px_-60px_rgba(0,0,0,0.6)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
            className
          )}
        >
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="(min-width: 1024px) 520px, 90vw"
            className={cn(
              "block h-full w-full object-cover transition duration-200 group-hover:scale-[1.02] group-focus-visible:scale-[1.02]",
              imageClassName
            )}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
              Click to zoom
            </span>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl border-none bg-transparent p-0 shadow-none sm:rounded-2xl">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-black/60">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="(min-width: 1280px) 960px, (min-width: 768px) 720px, 96vw"
            className="block max-h-[80vh] w-full object-contain"
          />
          {caption ? (
            <div className="border-t border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-sm text-[var(--text)]">
              {caption}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
