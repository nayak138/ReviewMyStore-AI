import { useEffect } from "react";
import { SITE_URL } from "@/site";

const DEFAULT_TITLE = "ReviewMyStore.AI — The AI-Powered Google Review Platform";

type MetaSelector =
  | { attr: "name"; value: string }
  | { attr: "property"; value: string };

function setMeta(sel: MetaSelector, content: string): () => void {
  const selector = `meta[${sel.attr}="${sel.value}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  const created = !el;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(sel.attr, sel.value);
    document.head.appendChild(el);
  }
  const prev = el.getAttribute("content");
  el.setAttribute("content", content);
  return () => {
    if (created) el!.remove();
    else if (prev !== null) el!.setAttribute("content", prev);
  };
}

function setCanonical(href: string): () => void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const created = !el;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  const prev = el.getAttribute("href");
  el.setAttribute("href", href);
  return () => {
    if (created) el!.remove();
    else if (prev !== null) el!.setAttribute("href", prev);
  };
}

/**
 * Sets document title, meta description, canonical URL, and Open Graph /
 * Twitter tags for a marketing page, restoring previous values on unmount.
 *
 * @param path optional route path (e.g. "/blog/my-post") used for the
 *   canonical link and og:url; when omitted those tags are left untouched.
 */
export function usePageMeta(title: string, description: string, path?: string) {
  useEffect(() => {
    document.title = title;

    const restores: Array<() => void> = [
      setMeta({ attr: "name", value: "description" }, description),
      setMeta({ attr: "property", value: "og:title" }, title),
      setMeta({ attr: "property", value: "og:description" }, description),
      setMeta({ attr: "name", value: "twitter:title" }, title),
      setMeta({ attr: "name", value: "twitter:description" }, description),
    ];

    if (path) {
      const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
      restores.push(setMeta({ attr: "property", value: "og:url" }, url));
      restores.push(setCanonical(url));
    }

    return () => {
      document.title = DEFAULT_TITLE;
      for (const restore of restores) restore();
    };
  }, [title, description, path]);
}
