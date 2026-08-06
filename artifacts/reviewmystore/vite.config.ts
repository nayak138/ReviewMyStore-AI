import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

import fs from 'node:fs';

import { blogPosts } from './src/pages/marketing/blog-data';
import {
  marketingRouteMeta,
  type RouteMeta,
} from './src/pages/marketing/route-meta';
import { SITE_URL } from './src/site';

/** All indexable marketing routes, including each blog post slug. */
function marketingRoutes(): string[] {
  return [
    '/',
    '/about',
    '/blog',
    ...blogPosts.map((p) => `/blog/${p.slug}`),
    '/resources',
    '/privacy',
    '/terms',
  ];
}

function toLastmod(date: string): string | undefined {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function buildSitemap(): string {
  const lastmodBySlug = new Map(
    blogPosts.map((p) => [`/blog/${p.slug}`, toLastmod(p.date)]),
  );
  const urls = marketingRoutes()
    .map((route) => {
      const lastmod = lastmodBySlug.get(route);
      return [
        '  <url>',
        `    <loc>${SITE_URL}${route === '/' ? '/' : route}</loc>`,
        ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
        `    <priority>${route === '/' ? '1.0' : '0.8'}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}

function buildRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Rewrites the HTML shell's title/description/OG/Twitter tags for a specific
 * marketing route and adds canonical + og:url, so crawlers and social bots
 * that never run JavaScript still see per-page metadata.
 */
function injectRouteMeta(html: string, route: string, meta: RouteMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = `${SITE_URL}${route === '/' ? '/' : route}`;
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
  out = out.replace('</head>', extra);
  return out;
}

/** Serves sitemap.xml and robots.txt in dev and emits them into the build. */
function seoFilesPlugin(): Plugin {
  const files: Record<string, { content: () => string; type: string }> = {
    'sitemap.xml': { content: buildSitemap, type: 'application/xml' },
    'robots.txt': { content: buildRobots, type: 'text/plain' },
  };
  return {
    name: 'seo-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0];
        const match = Object.keys(files).find((f) => pathname.endsWith(`/${f}`));
        if (!match) return next();
        res.setHeader('Content-Type', files[match].type);
        res.end(files[match].content());
      });
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        // Dev-server per-request injection so raw HTTP requests (crawlers,
        // social bots) see route-specific metadata before any JS runs.
        const rawPath = (ctx.originalUrl ?? ctx.path ?? '/').split('?')[0];
        const route =
          rawPath.length > 1 && rawPath.endsWith('/')
            ? rawPath.slice(0, -1)
            : rawPath;
        const meta = marketingRouteMeta()[route || '/'];
        if (!meta) return html;
        return injectRouteMeta(html, route || '/', meta);
      },
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName, source: file.content() });
      }
    },
    // Prerender: write a route-specific index.html for every marketing route
    // so static hosting serves crawler-visible per-page metadata.
    closeBundle() {
      const outDir = path.resolve(import.meta.dirname, 'dist/public');
      const shellPath = path.join(outDir, 'index.html');
      if (!fs.existsSync(shellPath)) return;
      const shell = fs.readFileSync(shellPath, 'utf8');
      for (const [route, meta] of Object.entries(marketingRouteMeta())) {
        const html = injectRouteMeta(shell, route, meta);
        const target =
          route === '/'
            ? shellPath
            : path.join(outDir, route.replace(/^\//, ''), 'index.html');
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, html);
      }
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    seoFilesPlugin(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
