import { Link, useParams, useLocation } from "wouter";
import { useEffect } from "react";
import { MarketingLayout } from "./layout";
import { usePageMeta } from "./use-page-meta";
import { blogPosts, getBlogPost } from "./blog-data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const post = getBlogPost(params.slug);

  usePageMeta(
    post ? `${post.title} — ReviewMyStore.AI Blog` : "Post not found — ReviewMyStore.AI Blog",
    post?.excerpt ?? "This article could not be found.",
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.slug]);

  if (!post) {
    return (
      <MarketingLayout>
        <section className="pt-40 pb-24 bg-background text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold text-foreground mb-4">Article not found</h1>
            <p className="text-muted-foreground mb-8">
              The post you're looking for doesn't exist or may have been moved.
            </p>
            <Link href="/blog" className="inline-flex items-center gap-2 text-primary font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to the blog
            </Link>
          </div>
        </section>
      </MarketingLayout>
    );
  }

  const others = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <MarketingLayout>
      <article className="pt-32 pb-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> All articles
            </Link>

            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider mb-4">
              <span className="text-primary">{post.category}</span>
              <span className="text-muted-foreground font-normal normal-case tracking-normal">
                {post.date}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground font-normal normal-case tracking-normal">
                <Clock className="w-3.5 h-3.5" /> {post.readTime}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              {post.title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">{post.excerpt}</p>

            <div className="flex items-center gap-3 pb-8 mb-10 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {post.author.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{post.author.name}</p>
                <p className="text-xs text-muted-foreground">{post.author.role}</p>
              </div>
            </div>

            <div className="space-y-10">
              {post.sections.map((section, i) => (
                <section key={i}>
                  {section.heading && (
                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
                      {section.heading}
                    </h2>
                  )}
                  {section.paragraphs.map((p, j) => (
                    <p key={j} className="text-muted-foreground leading-relaxed mb-4">
                      {p}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="space-y-3 mt-2">
                      {section.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-3 text-muted-foreground">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="leading-relaxed">{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-16 p-8 rounded-2xl border border-primary/20 bg-primary/5 text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Ready to grow your Google reviews?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Set up your first campaign in minutes. Free during early access.
              </p>
              <Button onClick={() => setLocation("/sign-up")} className="h-10 px-6">
                Start Free
              </Button>
            </div>
          </div>

          {/* More articles */}
          {others.length > 0 && (
            <div className="max-w-3xl mx-auto mt-20">
              <h2 className="text-xl font-bold text-foreground mb-6">Keep reading</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {others.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="block group cursor-pointer">
                    <div className="h-full p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all">
                      <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                        {p.category}
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {p.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                        Read <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </MarketingLayout>
  );
}
