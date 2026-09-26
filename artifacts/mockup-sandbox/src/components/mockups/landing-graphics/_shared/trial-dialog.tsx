import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type TrialDialogPlacement = "hero" | "header_desktop" | "header_mobile" | "footer_team" | "pricing" | "final_cta";

/** Design-only CTA: deliberately never submits a lead or creates an account. */
export function BookDemoDialog({ children }: { children: ReactNode; marketingDark?: boolean; placement?: TrialDialogPlacement }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="landing-graphics-scope dark marketing-dark border-border bg-background text-foreground">
      <DialogHeader>
        <DialogTitle>Guided trial — design preview only</DialogTitle>
        <DialogDescription className="text-muted-foreground">This is a local mockup of the marketing page. No trial request is sent, no account is created, and no one will contact you from this preview.</DialogDescription>
      </DialogHeader>
      <button type="button" onClick={() => setOpen(false)} className="mt-4 min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background">Close preview</button>
    </DialogContent>
  </Dialog>;
}