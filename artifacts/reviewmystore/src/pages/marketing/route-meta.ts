import { blogPosts } from "./blog-data";

export interface RouteMeta {
  title: string;
  description: string;
}

export const DEFAULT_META: RouteMeta = {
  title: "ReviewMyStore.AI — The AI-Powered Google Review Platform",
  description:
    "Collect more Google Reviews with AI. ReviewMyStore.AI helps businesses collect and grow Google Reviews using AI-powered review generation, QR codes and NFC devices.",
};

export const ABOUT_META: RouteMeta = {
  title: "About Us — ReviewMyStore.AI",
  description:
    "ReviewMyStore.AI helps local businesses turn happy customers into 5-star Google reviews — without the awkward asking. Learn about our mission and values.",
};

export const BLOG_META: RouteMeta = {
  title: "Blog — ReviewMyStore.AI",
  description:
    "Practical guides on Google reviews, local SEO, and reputation management for local businesses, from the ReviewMyStore.AI team.",
};

export const RESOURCES_META: RouteMeta = {
  title: "Resources & Guides — ReviewMyStore.AI",
  description:
    "Step-by-step guides for collecting Google reviews with ReviewMyStore.AI: setup, QR codes, NFC tap-to-review, AI drafts, and analytics.",
};

export const PRIVACY_META: RouteMeta = {
  title: "Privacy Policy — ReviewMyStore.AI",
  description:
    "Learn how ReviewMyStore.AI collects, uses, and protects information for businesses and their customers.",
};

export const TERMS_META: RouteMeta = {
  title: "Terms of Service — ReviewMyStore.AI",
  description:
    "Read the Terms of Service for ReviewMyStore.AI, the AI-powered Google review platform for local businesses.",
};

export function blogPostMeta(post: { title: string; excerpt: string }): RouteMeta {
  return {
    title: `${post.title} — ReviewMyStore.AI Blog`,
    description: post.excerpt,
  };
}

/** Metadata for every indexable marketing route, keyed by route path. */
export function marketingRouteMeta(): Record<string, RouteMeta> {
  const meta: Record<string, RouteMeta> = {
    "/": DEFAULT_META,
    "/about": ABOUT_META,
    "/blog": BLOG_META,
    "/resources": RESOURCES_META,
    "/privacy": PRIVACY_META,
    "/terms": TERMS_META,
  };
  for (const post of blogPosts) {
    meta[`/blog/${post.slug}`] = blogPostMeta(post);
  }
  return meta;
}
