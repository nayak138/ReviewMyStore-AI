import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent,
  type ReactElement,
} from "react";
import type { TrialDialogPlacement } from "./book-demo-dialog";

interface BookDemoDialogContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketingDark: boolean;
  dialogId: string;
  triggerRef: { current: HTMLElement | null };
  hasAppProviders: boolean;
  placement: TrialDialogPlacement;
}

type TriggerProps = {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  "aria-haspopup"?: "dialog";
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-busy"?: boolean;
};

export function BookDemoDialog({
  children,
  marketingDark = false,
  hasAppProviders = false,
  placement,
}: {
  children: ReactElement;
  marketingDark?: boolean;
  hasAppProviders?: boolean;
  placement: TrialDialogPlacement;
}) {
  const [DialogContent, setDialogContent] =
    useState<ComponentType<BookDemoDialogContentProps> | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadingRef = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogId = useId();

  if (!isValidElement<TriggerProps>(children)) {
    throw new Error("BookDemoDialog requires one trigger element.");
  }

  const requestOpen = async () => {
    if (DialogContent) {
      setOpen(true);
      return;
    }
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setLoadError(false);
    try {
      const module = await import("./book-demo-dialog");
      setDialogContent(() => module.BookDemoDialogContent);
      setOpen(true);
    } catch (error) {
      console.error("Unable to load the guided-trial request form.", error);
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const trigger = cloneElement(children, {
    onClick: (event: MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);
      if (event.defaultPrevented) return;
      triggerRef.current = event.currentTarget;
      void requestOpen();
    },
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    "aria-controls": open ? dialogId : undefined,
    "aria-busy": loading || undefined,
  });

  return (
    <>
      {trigger}
      {loading && (
        <span className="sr-only" role="status">
          Loading guided trial request form
        </span>
      )}
      {loadError && (
        <span className="sr-only" role="alert">
          The trial request form could not be opened. Please try again.
        </span>
      )}
      {DialogContent && (
        <DialogContent
          open={open}
          onOpenChange={setOpen}
          marketingDark={marketingDark}
          dialogId={dialogId}
          triggerRef={triggerRef}
          hasAppProviders={hasAppProviders}
          placement={placement}
        />
      )}
    </>
  );
}