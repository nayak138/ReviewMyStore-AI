import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Layers3,
  Link2,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FaqCategory = "Usage" | "Reviews" | "Social" | "Connections";

type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: React.ReactNode;
  keywords: string;
};

const categoryMeta: Record<
  FaqCategory,
  { label: string; icon: typeof Layers3; description: string }
> = {
  Usage: {
    label: "Allowance basics",
    icon: BarChart3,
    description: "How usage is measured and when it becomes available again.",
  },
  Reviews: {
    label: "Reviews and AI",
    icon: MessageCircle,
    description: "Imports, reply drafts, and public review generation.",
  },
  Social: {
    label: "Social publishing",
    icon: Sparkles,
    description: "Destinations, comments, media, and scheduled posts.",
  },
  Connections: {
    label: "Connected channels",
    icon: Link2,
    description: "Google, Meta Pages, and Instagram access.",
  },
};

const faqs: FaqItem[] = [
  {
    id: "business-allowance",
    category: "Usage",
    question: "Where do my business usage allowances live?",
    keywords:
      "business allowance usage limit remaining connected channels identity reconnect switch",
    answer: (
      <>
        <p>
          Usage allowances belong to the 5-Star.AI business, not to a Google or
          Meta login. Reconnecting an identity, or switching the identity
          attached to a channel, does not reset the business&apos;s allowance.
        </p>
        <p>
          Social actions use the same business allowance across that
          business&apos;s connected social channels. Think of the allowance as
          a shared balance for the business workspace rather than a separate
          balance for every login or destination.
        </p>
      </>
    ),
  },
  {
    id: "usage-terms",
    category: "Usage",
    question: "What do used, reserved, limit, and remaining mean?",
    keywords: "used reserved limit remaining in progress failed released quota",
    answer: (
      <>
        <p>
          <strong>Limit</strong> is the total number of units available in the
          current usage window. <strong>Used</strong> is what has completed and
          counted against that limit. <strong>Reserved</strong> is held while
          an operation is in progress, so two teammates cannot spend the same
          unit at once.
        </p>
        <p>
          <strong>Remaining</strong> is the available balance after completed
          and in-progress work are accounted for. If an operation fails, its
          reservation is released. A window can reset daily or monthly; the
          timestamp is shown in your local time, while the underlying period
          is based on UTC.
        </p>
      </>
    ),
  },
  {
    id: "reset-windows",
    category: "Usage",
    question: "When will my allowance reset?",
    keywords: "reset daily monthly local time utc timestamp window",
    answer: (
      <p>
        The usage panel shows the next reset timestamp in your local time.
        Reset periods themselves are UTC-based, so the displayed local time
        can look different from midnight in your region. Depending on the
        allowance, the window is daily or monthly. A reconnect or account
        switch does not start a new window.
      </p>
    ),
  },
  {
    id: "google-imports",
    category: "Reviews",
    question: "Are Google review imports the same as AI reply drafts?",
    keywords:
      "google reviews import imports ai reply draft public generation provider limit allowance",
    answer: (
      <>
        <p>
          No. Importing reviews from Google, drafting an AI reply to a review,
          and generating a public AI review are separate operations. They may
          have different availability and usage accounting.
        </p>
        <p>
          Google imports also depend on an upstream provider import limit. That
          provider limit is separate from your 5-Star.AI business allowance.
          If the provider has less capacity available, it can be the lower
          limit and constrain how many reviews can be imported. We do not
          promise a fixed provider quota.
        </p>
      </>
    ),
  },
  {
    id: "public-generations",
    category: "Reviews",
    question: "What is the difference between a reply draft and a public AI review?",
    keywords: "reply draft public review generation customer review response",
    answer: (
      <p>
        A reply draft is suggested wording for your team to review before
        responding to an existing review. A public AI review is generated
        wording intended for a customer to use when leaving a new review.
        They are different flows, even though both use AI.
      </p>
    ),
  },
  {
    id: "social-counting",
    category: "Social",
    question: "How are social posts counted?",
    keywords:
      "social post destination platform multiple platforms unit allowance count",
    answer: (
      <p>
        Social posts count by destination. Sending one post to Facebook and
        Instagram uses two units because it is delivered to two destinations.
        The business allowance is shared across connected channels, and each
        platform can also apply its own restrictions or limits.
      </p>
    ),
  },
  {
    id: "comments",
    category: "Social",
    question: "What is the difference between comment imports and comment replies?",
    keywords:
      "comments import fetch reply response social allowance provider restriction",
    answer: (
      <p>
        Comment imports fetch comments from a connected platform so your team
        can review them. Comment replies send a response back to the platform.
        These are separate actions. Both the 5-Star.AI business allowance and
        any separate platform or provider restrictions can apply.
      </p>
    ),
  },
  {
    id: "meta-attach",
    category: "Connections",
    question: "How do I connect a Meta Page or Instagram profile?",
    keywords:
      "meta facebook page instagram profile connect authorize choose available attach",
    answer: (
      <ol>
        <li>Start the connection and authorize access with Meta.</li>
        <li>
          Choose the available Page or Instagram profile you want to attach.
        </li>
        <li>
          Confirm the selection. The chosen destination then appears in
          Connected channels.
        </li>
      </ol>
    ),
  },
  {
    id: "meta-reconnect",
    category: "Connections",
    question: "I signed in with the wrong Meta account. What should I do?",
    keywords:
      "meta wrong login reconnect access clear provider login authorize correct account",
    answer: (
      <p>
        Use <strong>Reconnect access</strong> to clear the old provider login,
        then authorize Meta again with the correct account. This changes the
        provider identity used for access; it does not reset the business
        allowance.
      </p>
    ),
  },
  {
    id: "switch-attached",
    category: "Connections",
    question: "How do I replace an attached Meta Page or profile?",
    keywords:
      "meta switch connected channels replacement attached account current active confirm",
    answer: (
      <p>
        In <strong>Connected channels</strong>, choose <strong>Switch</strong>
        on the current account. Select and confirm the replacement. The
        current account remains active until that replacement is confirmed, so
        an unfinished switch does not interrupt publishing.
      </p>
    ),
  },
  {
    id: "instagram-media",
    category: "Social",
    question: "What media can I use for Instagram posts?",
    keywords:
      "instagram image video media jpg png webp gif mp4 mov webm size 25 100",
    answer: (
      <>
        <p>
          Instagram posts need at least one image or video. Accepted file types
          are JPG, PNG, WEBP, GIF, MP4, MOV, and WEBM.
        </p>
        <ul>
          <li>Images: up to 25 MB each.</li>
          <li>Videos: up to 100 MB each.</li>
        </ul>
        <p>
          Attached media is prepared by the social provider when the post is
          published or scheduled. Adding an attachment in the composer does
          not itself publish the post.
        </p>
      </>
    ),
  },
  {
    id: "scheduled-media",
    category: "Social",
    question: "What happens to media on a scheduled post?",
    keywords: "scheduled publish attached media provider prepare upload",
    answer: (
      <p>
        The attached image or video is prepared by the social provider at
        publish or schedule time. Keep the post and its attachment together
        until the scheduled action completes, and make sure the file still
        meets the accepted type and size requirements.
      </p>
    ),
  },
];

const categoryOrder: FaqCategory[] = [
  "Usage",
  "Reviews",
  "Social",
  "Connections",
];

function matchesFaq(item: FaqItem, query: string) {
  if (!query.trim()) return true;
  const haystack = `${item.question} ${item.keywords}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export default function Faq() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FaqCategory | "All">(
    "All",
  );

  const filteredFaqs = useMemo(
    () =>
      faqs.filter(
        (item) =>
          (activeCategory === "All" || item.category === activeCategory) &&
          matchesFaq(item, query),
      ),
    [activeCategory, query],
  );

  const resultLabel =
    filteredFaqs.length === faqs.length && !query && activeCategory === "All"
      ? "12 answers"
      : `${filteredFaqs.length} ${
          filteredFaqs.length === 1 ? "answer" : "answers"
        }`;

  const clearFilters = () => {
    setQuery("");
    setActiveCategory("All");
  };

  return (
    <div className="review-noise min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 md:px-8 md:py-10">
        <section
          className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-7 shadow-sm sm:px-8 sm:py-9 lg:px-12 lg:py-12"
          data-testid="faq-hero"
        >
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/5 text-primary"
                data-testid="badge-faq-page"
              >
                <CircleHelp className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Workspace guide
              </Badge>
              <span className="text-xs text-muted-foreground">
                For owners and teammates
              </span>
            </div>
            <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Clear answers for the work between reviews.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Understand allowances, connected identities, AI review tools, and
              social publishing without decoding product language.
            </p>

            <div className="mt-7 max-w-2xl">
              <label
                htmlFor="faq-search"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Search help
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="faq-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try “Meta”, “reserved”, or “Instagram media”"
                  className="h-12 rounded-xl border-border/80 bg-background/80 pl-10 pr-10 shadow-sm"
                  data-testid="input-faq-search"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Clear FAQ search"
                    data-testid="button-clear-faq-search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          className="mt-6 grid gap-3 sm:grid-cols-3"
          aria-label="Help guide overview"
          data-testid="faq-overview"
        >
          <OverviewTile
            icon={ShieldCheck}
            label="Business-first usage"
            value="Shared by channel"
            detail="Identity changes do not reset balances."
            testId="overview-usage"
          />
          <OverviewTile
            icon={Clock3}
            label="Reset timing"
            value="UTC-based windows"
            detail="Reset timestamps are shown in local time."
            testId="overview-reset"
          />
          <OverviewTile
            icon={UsersRound}
            label="Built for teams"
            value="Safe handoffs"
            detail="Reservations protect work in progress."
            testId="overview-teams"
          />
        </section>

        <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.68fr)] lg:items-start">
          <aside className="lg:sticky lg:top-6" aria-label="FAQ categories">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Browse by topic
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {resultLabel}
                </p>
              </div>
              {(query || activeCategory !== "All") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="button-clear-faq-filters"
                >
                  Clear filters
                </button>
              )}
            </div>

            <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible">
              <CategoryButton
                active={activeCategory === "All"}
                icon={Layers3}
                label="All answers"
                count={faqs.length}
                onClick={() => setActiveCategory("All")}
                testId="button-faq-category-all"
              />
              {categoryOrder.map((category) => {
                const meta = categoryMeta[category];
                const Icon = meta.icon;
                const count = faqs.filter(
                  (item) => item.category === category,
                ).length;
                return (
                  <CategoryButton
                    key={category}
                    active={activeCategory === category}
                    icon={Icon}
                    label={meta.label}
                    count={count}
                    onClick={() => setActiveCategory(category)}
                    testId={`button-faq-category-${category.toLowerCase()}`}
                  />
                );
              })}
            </nav>

            <Card className="mt-6 hidden border-primary/15 bg-primary/5 lg:block">
              <CardContent className="p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">
                  A useful rule of thumb
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  A business owns the allowance. A destination owns its access
                  rules. Both can matter for one action.
                </p>
              </CardContent>
            </Card>
          </aside>

          <main className="min-w-0" aria-live="polite">
            {filteredFaqs.length > 0 ? (
              <div className="space-y-3" data-testid="faq-results">
                {filteredFaqs.map((item, index) => (
                  <FaqRow item={item} index={index} key={item.id} />
                ))}
              </div>
            ) : (
              <Card
                className="border-dashed border-border bg-card/70"
                data-testid="faq-empty-state"
              >
                <CardContent className="flex flex-col items-start gap-4 p-7 sm:p-9">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                    <Search className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      No answers match that search
                    </h3>
                    <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                      Try a broader term, or clear the filters to see every
                      topic in the guide.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid="button-show-all-faqs"
                  >
                    Show all answers
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </CardContent>
              </Card>
            )}
          </main>
        </div>

        <footer
          className="mt-10 flex flex-col gap-3 border-t border-border/70 pt-5 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
          data-testid="faq-footer-note"
        >
          <span>Static product guidance. Your workspace always shows the current usage state.</span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            Written for practical handoffs
          </span>
        </footer>
      </div>
    </div>
  );
}

function OverviewTile({
  icon: Icon,
  label,
  value,
  detail,
  testId,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  detail: string;
  testId: string;
}) {
  return (
    <Card className="border-border/80 bg-card/80 shadow-sm" data-testid={`card-${testId}`}>
      <CardContent className="flex items-start gap-3.5 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm font-semibold text-foreground" data-testid={`text-${testId}-value`}>
            {value}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryButton({
  active,
  icon: Icon,
  label,
  count,
  onClick,
  testId,
}: {
  active: boolean;
  icon: typeof Layers3;
  label: string;
  count: number;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-max items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full",
        active
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-transparent bg-card/50 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
      )}
      aria-pressed={active}
      data-testid={testId}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
          active
            ? "bg-primary/10 text-primary"
            : "bg-secondary text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FaqRow({ item, index }: { item: FaqItem; index: number }) {
  const Icon = categoryMeta[item.category].icon;

  return (
    <details
      className="group rounded-2xl border border-border/80 bg-card shadow-sm transition-colors open:border-primary/25 open:bg-card"
      open={index === 0}
      data-testid={`faq-item-${item.id}`}
    >
      <summary
        className="flex cursor-pointer list-none items-start gap-3 p-4 sm:items-center sm:p-5 [&::-webkit-details-marker]:hidden"
        data-testid={`button-toggle-faq-${item.id}`}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary sm:mt-0">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {item.category}
          </span>
          <span className="block text-sm font-semibold leading-6 text-foreground sm:text-base">
            {item.question}
          </span>
        </span>
        <ChevronDown
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-border/70 px-4 pb-5 pt-4 pl-[4.25rem] text-sm leading-6 text-muted-foreground sm:px-5 sm:pb-6 sm:pl-[4.75rem]">
        <div className="max-w-3xl space-y-3 [&_li]:relative [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {item.answer}
        </div>
      </div>
    </details>
  );
}