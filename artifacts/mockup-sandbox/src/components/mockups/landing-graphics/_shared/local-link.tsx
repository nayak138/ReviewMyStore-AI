import type { AnchorHTMLAttributes, ReactNode } from "react";

/** Sandbox-only router stand-in; keeps link styling without leaving the preview. */
export function Link({ href: _href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) {
  return <a href="#" {...props} onClick={(event) => { event.preventDefault(); props.onClick?.(event); }}>{children}</a>;
}