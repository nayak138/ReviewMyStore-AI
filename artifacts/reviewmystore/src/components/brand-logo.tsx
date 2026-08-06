import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

export const BRAND_ICON = `${BASE}brand/logo-icon.png`;
export const BRAND_LOGO_LIGHT = `${BASE}brand/logo-horizontal.png`;
export const BRAND_LOGO_DARK = `${BASE}brand/logo-horizontal-dark.png`;

/** Theme-aware horizontal lockup: swaps the light/dark variant via the `.dark` class. */
export function BrandLogo({ className, alt = "ReviewMyStore.AI" }: { className?: string; alt?: string }) {
  return (
    <>
      <img src={BRAND_LOGO_LIGHT} alt={alt} className={cn("dark:hidden", className)} />
      <img src={BRAND_LOGO_DARK} alt={alt} className={cn("hidden dark:block", className)} />
    </>
  );
}

/** Square brand icon (storefront + star). */
export function BrandIcon({ className, alt = "ReviewMyStore.AI" }: { className?: string; alt?: string }) {
  return <img src={BRAND_ICON} alt={alt} className={className} />;
}
