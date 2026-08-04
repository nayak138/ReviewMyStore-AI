import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { useResolveRedirect } from "@workspace/api-client-react";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Landing route for QR/NFC short links (/r/:code). Resolves the code via the
 * public redirect API — which logs the scan event server-side — then hard
 * redirects to the campaign's review page. Kept intentionally minimal: this
 * page is only ever seen for a moment on a customer's phone.
 */
export default function ShortRedirect() {
  const { code } = useParams<{ code: string }>();
  const [failed, setFailed] = useState(false);
  const firedRef = useRef(false);

  const resolve = useResolveRedirect({
    mutation: {
      onSuccess: (result) => {
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        window.location.replace(`${base}${result.targetPath}`);
      },
      onError: () => setFailed(true),
    },
  });

  useEffect(() => {
    if (firedRef.current || !code) return;
    firedRef.current = true;
    resolve.mutate({
      code,
      data: { referrer: document.referrer || null },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (failed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <div>
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground">
            This link is no longer active
          </h1>
          <p className="text-muted-foreground mt-2 max-w-sm">
            The campaign behind this code may be paused or removed. Please
            check with the business for an updated link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Taking you to the review page…</p>
    </div>
  );
}
