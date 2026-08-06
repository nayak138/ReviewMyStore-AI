import { ReactNode } from "react";
import { MarketingLayout } from "./layout";
import { usePageMeta } from "./use-page-meta";

export interface LegalSection {
  title: string;
  body: ReactNode;
}

/** Shared shell for legal documents (Privacy, Terms): hero header with
 * last-updated date, then a readable single-column article. */
export function LegalPage({
  badge,
  title,
  intro,
  lastUpdated,
  sections,
  metaTitle,
  metaDescription,
  path,
}: {
  badge: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
  metaTitle: string;
  metaDescription: string;
  path: string;
}) {
  usePageMeta(metaTitle, metaDescription, path);

  return (
    <MarketingLayout>
      <section className="pt-32 pb-12 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6 border border-primary/20">
              {badge}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              {title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">{intro}</p>
            <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </section>

      <section className="pb-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <article className="max-w-3xl mx-auto space-y-10">
            {sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-3">
                  {i + 1}. {section.title}
                </h2>
                <div className="text-muted-foreground leading-relaxed space-y-3 text-[15px]">
                  {section.body}
                </div>
              </section>
            ))}
          </article>
        </div>
      </section>
    </MarketingLayout>
  );
}
