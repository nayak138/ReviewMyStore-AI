import { Link } from "wouter";
import { MarketingLayout } from "./layout";
import { usePageMeta } from "./use-page-meta";
import { blogPosts } from "./blog-data";
import { ArrowRight, Clock } from "lucide-react";

export default function Blog() {
  usePageMeta(
    "Blog — ReviewMyStore.AI",
    "Practical guides on Google reviews, local SEO, and reputation management for local businesses, from the ReviewMyStore.AI team.",
  );

  const [featured, ...rest] = blogPosts;

  return (
    <MarketingLayout>
      <section className="pt-32 pb-16 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6 border border-primary/20">
              Blog
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
              Reviews, reputation & local growth
            </h1>
            <p className="text-lg text-muted-foreground">
              Practical guides for local businesses that want more customers to find them — and love
              what they find.
            </p>
          </div>

          {/* Featured post */}
          <Link
            href={`/blog/${featured.slug}`}
            className="block max-w-5xl mx-auto mb-12 group cursor-pointer"
          >
            <article className="p-8 md:p-12 rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 transition-all">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider mb-4">
                <span className="text-primary">{featured.category}</span>
                <span className="text-muted-foreground font-normal normal-case tracking-normal">
                  {featured.date}
                </span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground mb-4 group-hover:text-primary transition-colors">
                {featured.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-3xl mb-6">
                {featured.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" /> {featured.readTime}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </article>
          </Link>

          {/* Post grid */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block group cursor-pointer">
                <article className="h-full p-7 rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 transition-all flex flex-col">
                  <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider mb-4">
                    <span className="text-primary">{post.category}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{post.date}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {post.readTime}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
