# Publish the 5-Star.AI docs on Cloudflare Pages

The public guides are prepared in `docs-site/docs`. The ReviewMyStore.ai
footer still points to Notion until the Cloudflare site and custom domain are
verified.

## 1. Push the changes to the connected Git repository

Cloudflare Pages deploys from a Git repository. Push this workspace's changes
to the GitHub repository you want Cloudflare to build. Do not make the SaaS
source repository public just for docs hosting.

## 2. Create the Cloudflare Pages project

1. Sign in to Cloudflare.
2. Open **Workers & Pages** and choose **Create application** → **Pages** →
   **Connect to Git**.
3. Authorize the Git provider and select the repository containing this
   project.
4. Use the following build settings:

   | Setting | Value |
   | --- | --- |
   | Root directory | `/` |
   | Install command | `pnpm install --frozen-lockfile --filter @workspace/reviewmystore-docs...` |
   | Build command | `pnpm --filter @workspace/reviewmystore-docs run build` |
   | Build output directory | `docs-site/docs/.vitepress/dist` |

5. Save and deploy. Cloudflare will provide a temporary `*.pages.dev` URL.

## 3. Verify the temporary site

Before attaching the custom domain, open the `pages.dev` URL and confirm these
pages load and the local search works:

- `/`
- `/agencies`
- `/store-owners`
- `/usage-and-social`

Check the pages on both desktop and mobile. Keep the Notion pages published
as a fallback while validating.

## 4. Add the custom domain

1. In the Pages project, open **Custom domains** and add
   `docs.5-star.ai`.
2. Add the DNS record Cloudflare displays at the DNS provider for
   `5-star.ai`. For a subdomain this is usually a CNAME pointing to the
   project's `pages.dev` hostname; follow the exact target shown in the
   dashboard.
3. Wait for DNS verification and for Cloudflare to mark the domain active
   with HTTPS enabled.
4. Open `https://docs.5-star.ai` and verify the same four pages again.

## 5. Switch the app footer

Once `https://docs.5-star.ai` is live, update the **Docs** link in the
ReviewMyStore.ai Resources footer from the Notion root page to the new docs
domain, then publish the app update. Keep the Notion pages available until the
new link has been verified in the published site.

If the Git repository, build, or DNS setup reports an error, share the
non-secret error text or the `pages.dev` URL. Do not send account passwords,
API keys, or tokens.