import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

export const BRAND_ICON = `${BASE}brand/logo-icon.png`;
export const BRAND_LOGO_LIGHT = `${BASE}brand/logo-horizontal.png`;
export const BRAND_LOGO_DARK = `${BASE}brand/logo-horizontal-dark.png`;
const FIVE_STAR_LOGO = `${BASE}attached_assets/Untitled (4 x 2 in) (2).png`;

/** Primary 5-Star.AI horizontal lockup. */
export function BrandLogo({ className, alt = "5-Star.AI" }: { className?: string; alt?: string }) {
  return <img src={FIVE_STAR_LOGO} alt={alt} className={cn("object-contain", className)} />;
}

/** Compact storefront-and-star mark for app and auth surfaces. */
export function BrandIcon({ className, alt = "5-Star.AI" }: { className?: string; alt?: string }) {
  return <img src={BRAND_ICON} alt={alt} className={className} />;
}
