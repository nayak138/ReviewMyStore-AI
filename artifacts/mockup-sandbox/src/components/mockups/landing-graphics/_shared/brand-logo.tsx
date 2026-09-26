import { cn } from "@/lib/utils";

/** The exact existing light/dark logo assets, isolated to the canvas preview. */
export function BrandLogo({ className, alt = "5-Star.AI" }: { className?: string; alt?: string }) {
  return <>
    <img src="/__mockup/images/landing-graphics/brand/dark-logo.png" alt={alt} className={cn("object-contain dark:hidden", className)} />
    <img src="/__mockup/images/landing-graphics/brand/light-logo.png" alt="" aria-hidden="true" className={cn("hidden object-contain dark:block", className)} />
  </>;
}