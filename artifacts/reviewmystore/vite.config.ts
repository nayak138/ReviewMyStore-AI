import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createServer, defineConfig, loadEnv, type Plugin } from "vite";

import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

import fs from "node:fs";

import { blogPosts } from "./src/pages/marketing/blog-data";
import {
  marketingRouteMeta,
  type RouteMeta,
} from "./src/pages/marketing/route-meta";
import { resolveSiteUrl } from "./src/lib/site-url";

/** All indexable marketing routes, including each blog post slug. */
function marketingRoutes(): string[] {
  return [
    "/",
    "/about",
    "/blog",
    ...blogPosts.map((p) => `/blog/${p.slug}`),
    "/resources",
    "/privacy",
    "/terms",
  ];
}

function toLastmod(date: string): string | undefined {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function buildSitemap(siteUrl: string): string {
  const lastmodBySlug = new Map(
    blogPosts.map((p) => [`/blog/${p.slug}`, toLastmod(p.date)]),
  );
  const urls = marketingRoutes()
    .map((route) => {
      const lastmod = lastmodBySlug.get(route);
      return [
        "  <url>",
        `    <loc>${siteUrl}${route === "/" ? "/" : route}</loc>`,
        ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
        `    <priority>${route === "/" ? "1.0" : "0.8"}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

function buildRobots(siteUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

function buildLlmsTxt(siteUrl: string): string {
  const routeMeta = marketingRouteMeta();
  const routes = marketingRoutes();
  const sections = [
    {
      heading: "Product and resources",
      routes: routes.filter(
        (route) =>
          route === "/" ||
          route === "/about" ||
          route === "/resources" ||
          route === "/blog",
      ),
    },
    {
      heading: "Local SEO and reputation management guides",
      routes: routes.filter((route) => route.startsWith("/blog/")),
    },
    {
      heading: "Policies",
      routes: routes.filter(
        (route) => route === "/privacy" || route === "/terms",
      ),
    },
  ];

  const lines = [
    "# 5-Star.AI",
    "",
    "> 5-Star.AI helps local businesses collect more Google reviews, improve local search visibility, and manage their online reputation.",
    "",
    "Use the canonical pages below for product information, setup guidance, and educational content about Google reviews, local SEO, and reputation management.",
  ];

  for (const section of sections) {
    if (section.routes.length === 0) continue;
    lines.push("", `## ${section.heading}`, "");
    for (const route of section.routes) {
      const meta = routeMeta[route];
      const url = `${siteUrl}${route === "/" ? "/" : route}`;
      lines.push(
        `- [${meta?.title ?? route}](${url})${meta ? `: ${meta.description}` : ""}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Rewrites the HTML shell's title/description/OG/Twitter tags for a specific
 * marketing route and adds canonical + og:url, so crawlers and social bots
 * that never run JavaScript still see per-page metadata.
 */
function injectRouteMeta(
  html: string,
  route: string,
  meta: RouteMeta,
  siteUrl: string,
): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = `${siteUrl}${route === "/" ? "/" : route}`;
  let out = html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(
      /(<meta name="description" content=")[^"]*(")/,
      `$1${description}$2`,
    )
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(
      /(<meta property="og:description" content=")[^"]*(")/,
      `$1${description}$2`,
    )
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(
      /(<meta name="twitter:description" content=")[^"]*(")/,
      `$1${description}$2`,
    );
  const extra = `    <meta property="og:url" content="${url}" />\n    <link rel="canonical" href="${url}" />\n  </head>`;
  out = out.replace("</head>", extra);
  return out;
}

function injectRouteBody(html: string, body: string): string {
  const root = '<div id="root"></div>';
  if (!html.includes(root)) {
    throw new Error("Unable to prerender marketing route: #root shell not found");
  }
  return html.replace(root, `<div id="root">${body}</div>`);
}

async function renderMarketingBodies(): Promise<Record<string, string>> {
  const root = path.resolve(import.meta.dirname);
  const server = await createServer({
    configFile: false,
    root,
    appType: "custom",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(root, "src"),
        "@assets": path.resolve(root, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    server: {
      middlewareMode: true,
      hmr: false,
    },
  });

  try {
    const module = (await server.ssrLoadModule(
      "/src/marketing-prerender.tsx",
    )) as {
      renderMarketingRoute: (route: string) => string;
    };
    return Object.fromEntries(
      marketingRoutes().map((route) => [
        route,
        module.renderMarketingRoute(route),
      ]),
    );
  } finally {
    await server.close();
  }
}

/** Serves SEO discovery files in dev and emits them into the build. */
function seoFilesPlugin(siteUrl: string): Plugin {
  const files: Record<string, { content: () => string; type: string }> = {
    "sitemap.xml": {
      content: () => buildSitemap(siteUrl),
      type: "application/xml",
    },
    "robots.txt": {
      content: () => buildRobots(siteUrl),
      type: "text/plain",
    },
    "llms.txt": {
      content: () => buildLlmsTxt(siteUrl),
      type: "text/plain; charset=utf-8",
    },
  };
  return {
    name: "seo-files",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? "").split("?")[0];
        const match = Object.keys(files).find((f) =>
          pathname.endsWith(`/${f}`),
        );
        if (!match) return next();
        res.setHeader("Content-Type", files[match].type);
        res.end(files[match].content());
      });
    },
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        // Dev-server per-request injection so raw HTTP requests (crawlers,
        // social bots) see route-specific metadata before any JS runs.
        const rawPath = (ctx.originalUrl ?? ctx.path ?? "/").split("?")[0];
        const route =
          rawPath.length > 1 && rawPath.endsWith("/")
            ? rawPath.slice(0, -1)
            : rawPath;
        const meta = marketingRouteMeta()[route || "/"];
        if (!meta) return html;
        return injectRouteMeta(html, route || "/", meta, siteUrl);
      },
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(files)) {
        this.emitFile({ type: "asset", fileName, source: file.content() });
      }
    },
    // Prerender: write a route-specific index.html for every marketing route
    // so static hosting serves crawler-visible per-page metadata.
    async closeBundle() {
      const outDir = path.resolve(import.meta.dirname, "dist/public");
      const shellPath = path.join(outDir, "index.html");
      if (!fs.existsSync(shellPath)) return;
      const shell = fs.readFileSync(shellPath, "utf8");
      const routeBodies = await renderMarketingBodies();
      for (const [route, meta] of Object.entries(marketingRouteMeta())) {
        const body = routeBodies[route];
        if (!body) {
          throw new Error(`Missing prerendered body for marketing route ${route}`);
        }
        const html = injectRouteBody(
          injectRouteMeta(shell, route, meta, siteUrl),
          body,
        );
        const target =
          route === "/"
            ? shellPath
            : path.join(outDir, route.replace(/^\//, ""), "index.html");
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, html);
      }
    },
  };
}

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = resolveSiteUrl(env.VITE_SITE_URL, mode === "production");
  const isDevelopment = mode !== "production";

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss({ optimize: false }),
      ...(isDevelopment ? [runtimeErrorOverlay()] : []),
      seoFilesPlugin(siteUrl),
      ...(isDevelopment && process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
