import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "en-US",
  title: "5-Star.AI Docs",
  titleTemplate: ":title | 5-Star.AI Docs",
  description:
    "Practical guides for agencies and store teams using 5-Star.AI.",
  cleanUrls: true,
  lastUpdated: true,
  vite: {
    build: {
      target: "esnext",
    },
  },
  head: [
    ["link", { rel: "icon", href: "/favicon.png" }],
    ["meta", { name: "theme-color", content: "#f7f8fc" }],
    ["meta", { property: "og:site_name", content: "5-Star.AI Docs" }],
  ],
  themeConfig: {
    logo: "/favicon.png",
    siteTitle: "5-Star.AI Docs",
    outline: {
      level: [2, 3],
      label: "On this page",
    },
    search: {
      provider: "local",
    },
    nav: [
      { text: "Agency guide", link: "/agencies" },
      { text: "Store owner guide", link: "/store-owners" },
      { text: "Usage guide", link: "/usage-and-social" },
    ],
    sidebar: [
      {
        text: "Guides",
        items: [
          { text: "Overview", link: "/" },
          { text: "For Agencies", link: "/agencies" },
          { text: "For Store Owners", link: "/store-owners" },
          { text: "Usage & Social Publishing", link: "/usage-and-social" },
        ],
      },
    ],
    footer: {
      message: "Practical guidance for better review operations.",
      copyright: "© 5-Star.AI",
    },
  },
});