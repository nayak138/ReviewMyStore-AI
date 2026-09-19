import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

// These files are the single primary brand asset set:
// favicon = the icon, dark-logo = dark lettering for light surfaces,
// light-logo = light lettering for dark surfaces.
export const BRAND_ICON = `${BASE}brand/favicon.png`;
export const BRAND_LOGO_LIGHT = `${BASE}brand/dark-logo.png`;
export const BRAND_LOGO_DARK = `${BASE}brand/light-logo.png`;

/** Primary 5-Star.AI horizontal lockup. */
export function BrandLogo({ className, alt = "5-Star.AI" }: { className?: string; alt?: string }) {
  return (
    <>
      <img src={BRAND_LOGO_LIGHT} alt={alt} className={cn("object-contain dark:hidden", className)} />
      <img src={BRAND_LOGO_DARK} alt="" aria-hidden="true" className={cn("hidden object-contain dark:block", className)} />
    </>
  );
}

/** Compact storefront-and-star mark for app and auth surfaces. */
export function BrandIcon({ className, alt = "5-Star.AI" }: { className?: string; alt?: string }) {
  return <img src={BRAND_ICON} alt={alt} className={className} />;
}
