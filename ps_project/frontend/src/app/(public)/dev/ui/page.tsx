"use client";

import { useState } from "react";

import { ImageZoom } from "@/features/ui-core/components/ImageZoom";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/features/ui-core/primitives";
import {
  toastError,
  toastInfo,
  toastSuccess,
} from "@/features/ui-core/toast";
import { Panel } from "@/ui-core/Panel";

const sampleImage =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80";

export default function UiPlaygroundPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("overview");

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-strong">
            Dev
          </p>
          <h1 className="text-3xl font-semibold text-[var(--text)]">
            UI Playground
          </h1>
          <p className="max-w-2xl text-sm text-[var(--muted)]">
            Quick sanity checks for the interactive primitives that will replace
            the legacy Bootstrap/jQuery behaviors.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Dialog">
            <div className="space-y-4 text-sm text-[var(--muted)]">
              <p>
                Open the modal to verify backdrop, focus trap, ESC/backdrop
                close, and button alignment.
              </p>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Open dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Modern dialog</DialogTitle>
                    <DialogDescription>
                      Radix-driven modal replacing the legacy Bootstrap dialogs.
                    </DialogDescription>
                  </DialogHeader>
                  <p className="text-sm text-[var(--text)]">
                    Focus stays trapped while open. Close with ESC or clicking
                    the backdrop.
                  </p>
                  <DialogFooter>
                    <Button
                      variant="secondary"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        toastSuccess("Saved", "Dialog action confirmed");
                        setDialogOpen(false);
                      }}
                    >
                      Confirm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Panel>

          <Panel title="Dropdown & Tooltip">
            <div className="space-y-4 text-sm text-[var(--muted)]">
              <p>
                Radix dropdown menu for inline actions plus a tooltip with
                hover/focus support.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary">Open menu</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => toastInfo("New file")}>
                      New file
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toastInfo("Copy link")}>
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-400 hover:text-red-200"
                      onClick={() =>
                        toastError("Danger zone", "Simulated destructive click")
                      }
                    >
                      Delete forever
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost">Hover for tooltip</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Tooltips also work on keyboard focus.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </Panel>

          <Panel title="Tabs">
            <div className="space-y-4 text-sm text-[var(--muted)]">
              <p>Simple Radix tabs for switching panels without reflow.</p>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 text-[var(--text)]">
                  <p className="font-semibold text-[var(--text)]">
                    Overview tab
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    Use this for summaries or quick stats in the editor/player.
                  </p>
                </TabsContent>
                <TabsContent value="details" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 text-[var(--text)]">
                  <p className="font-semibold text-[var(--text)]">
                    Details tab
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    Swap in forms, lists, or inspector panes here.
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          </Panel>

          <Panel title="Toasts & Image zoom">
            <div className="space-y-4 text-sm text-[var(--muted)]">
              <p>Sonner toasts plus the new ImageZoom/lightbox helper.</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    toastSuccess(
                      "Toast success",
                      "Matches legacy Toastify flow but via Sonner."
                    )
                  }
                >
                  Success toast
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    toastError(
                      "Toast error",
                      "Example of a destructive or failed action."
                    )
                  }
                >
                  Error toast
                </Button>
              </div>
              <div className="max-w-sm">
                <ImageZoom
                  src={sampleImage}
                  alt="Sample scenic image"
                  caption="Image zoom overlays use the Dialog primitive underneath."
                />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </TooltipProvider>
  );
}
