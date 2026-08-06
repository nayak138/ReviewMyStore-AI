import { useEffect } from "react";

const DEFAULT_TITLE = "ReviewMyStore.AI — The AI-Powered Google Review Platform";

/** Sets document title + meta description for a marketing page, restoring defaults on unmount. */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    let created = false;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
      created = true;
    }
    const prev = meta.content;
    meta.content = description;

    let og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const prevOg = og?.content;
    if (og) og.content = title;

    return () => {
      document.title = DEFAULT_TITLE;
      if (meta) {
        if (created) meta.remove();
        else meta.content = prev;
      }
      if (og && prevOg !== undefined) og.content = prevOg;
    };
  }, [title, description]);
}
