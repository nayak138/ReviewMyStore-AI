import { blogPosts } from "./blog-data";

export interface RouteMeta {
  title: string;
  description: string;
}

export const DEFAULT_META: RouteMeta = {
  title: "5-Star.AI — Your reputation partner",
  description:
    "5-Star.AI helps local businesses and agencies turn great customer moments into a stronger Google presence with practical reputation support.",
};

export const ABOUT_META: RouteMeta = {
  title: "About Us — 5-Star.AI",
  description:
    "5-Star.AI helps local businesses turn happy customers into 5-star Google reviews — without the awkward asking. Learn about our mission and values.",
};

export const BLOG_META: RouteMeta = {
  title: "Blog — 5-Star.AI",
  description:
    "Practical guides on Google reviews, local SEO, and reputation management for local businesses, from the 5-Star.AI team.",
};

export const RESOURCES_META: RouteMeta = {
  title: "Resources & Guides — 5-Star.AI",
  description:
    "Step-by-step guides for collecting Google reviews with 5-Star.AI: setup, QR codes, NFC tap-to-review, AI drafts, and analytics.",
};

export const PRIVACY_META: RouteMeta = {
  title: "Privacy Policy — 5-Star.AI",
  description:
    "Learn how 5-Star.AI collects, uses, and protects information for businesses and their customers.",
};

export const TERMS_META: RouteMeta = {
  title: "Terms of Service — 5-Star.AI",
  description:
    "Read the Terms of Service for 5-Star.AI, the AI-powered Google review platform for local businesses.",
};

export function blogPostMeta(post: { title: string; excerpt: string }): RouteMeta {
  return {
    title: `${post.title} — 5-Star.AI Blog`,
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
