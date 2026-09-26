import { ArrowRight, Check, ClipboardEdit, Link2, MessageSquareText, QrCode, ShieldCheck, Star, WandSparkles } from "lucide-react";
import { HowItWorksLink, TrialCta } from "../_shared/hero";

export function RefreshHero() {
  return (
    <>
      <section id="top" className="vr-hero" aria-labelledby="hero-heading" data-testid="section-hero">
        <div className="vr-hero-inner">
          <div className="vr-hero-copy">
            <p className="vr-overline">Genuine reviews, guided</p>
            <h1 id="hero-heading" className="font-display">Your reputation deserves a system.</h1>
            <p className="vr-hero-lede">5-Star.AI helps local businesses, agencies, and multi-location teams invite genuine Google reviews, manage feedback, and draft thoughtful replies. Customers keep control of their final words.</p>
            <div className="vr-hero-actions"><TrialCta testId="button-hero-trial" placement="hero" /><HowItWorksLink testId="link-hero-how-it-works" /></div>
            <div className="vr-terms"><strong>7-Day Free Trial · No Credit Card · No Sign Up</strong>Request a guided trial without creating a 5-Star.AI account. Share your contact details and our team will follow up to arrange setup.</div>
          </div>
          <div className="vr-hero-art" aria-hidden="true">
            <img src="/__mockup/images/landing-graphics/reputation-sculpture.webp" alt="" />
            <div className="vr-orbit-note vr-note-a"><Star />The moment they remember</div>
            <div className="vr-orbit-note vr-note-b"><ClipboardEdit />The words they choose</div>
          </div>
        </div>
      </section>
      <div className="vr-proof-strip" aria-label="Product commitments">
        <div className="vr-proof-strip-inner">
          <span><ClipboardEdit />Editable drafts, never scripted praise</span>
          <span><ShieldCheck />Nothing posts automatically</span>
          <span><Check />Guided setup with a real team</span>
        </div>
      </div>
    </>
  );
}

export function RefreshApproach() {
  return (
    <section id="approach" aria-labelledby="approach-heading" className="vr-chapter vr-approach" data-testid="section-approach">
      <div className="vr-section-wrap vr-split">
        <div>
          <p className="mk-eyebrow">The problem</p>
          <h2 id="approach-heading" className="vr-section-title font-display">Review requests are inconsistent.</h2>
          <p className="vr-body">Asking relies on someone remembering at the right moment. Customers who do agree start from a blank page. And the team has no repeatable way to follow up, read what comes back, and reply well.</p>
        </div>
        <div className="vr-friction" aria-label="The three gaps in a typical review request">
          <div className="vr-friction-row"><span className="vr-friction-mark">01</span><span>The moment passes before anyone asks.</span></div>
          <div className="vr-friction-row"><span className="vr-friction-mark">02</span><span>A blank review box leaves customers stuck.</span></div>
          <div className="vr-friction-row"><span className="vr-friction-mark">03</span><span>Feedback and replies end up scattered.</span></div>
        </div>
      </div>
    </section>
  );
}

const flow = [
  { icon: QrCode, title: "Invite", body: "A campaign QR code or link gives customers a simple place to begin." },
  { icon: MessageSquareText, title: "Listen", body: "They share a rating and the details that actually mattered." },
  { icon: WandSparkles, title: "Draft", body: "A suggestion helps them put their own experience into words." },
  { icon: ClipboardEdit, title: "Decide", body: "They edit, discard or choose whether to continue to Google." },
];
export function RefreshHowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="vr-chapter" data-testid="section-how-it-works">
      <div className="vr-section-wrap vr-flow">
        <div className="vr-flow-head"><p className="mk-eyebrow">Two journeys</p><h2 id="how-heading" className="vr-section-title font-display">How it works.</h2><p className="vr-body">A clear path for the customer. A repeatable workflow for the team behind them.</p></div>
        <div className="vr-flow-rail" aria-label="Customer review journey">
          {flow.map(({ icon: Icon, title, body }, i) => <div className="vr-flow-step" key={title}><span className="vr-flow-num">0{i + 1} / 04</span><span className="vr-flow-visual"><Icon aria-hidden="true" /></span><h3>{title}</h3><p>{body}</p></div>)}
        </div>
        <p className="mt-5 flex items-center gap-2 text-sm text-[#aebbd4]"><Link2 className="h-4 w-4 text-[#aebeff]" />For teams: set up a business, share a campaign, inspect interactions and manage replies.</p>
      </div>
    </section>
  );
}

export function RefreshFeedback() {
  return (
    <section id="stories" aria-labelledby="stories-heading" className="vr-chapter vr-feedback" data-testid="section-stories">
      <div className="vr-section-wrap">
        <p className="mk-eyebrow">What the flow can sound like</p>
        <h2 id="stories-heading" className="vr-section-title font-display">Real voices are the point.</h2>
        <p className="vr-body max-w-2xl">These fictional examples illustrate the kind of specific, human feedback a customer might write. They are not customer testimonials or published reviews. We only publish customer stories with permission.</p>
        <div className="vr-feedback-grid">
          <article className="vr-feedback-card"><small>Illustrative feedback / fictional example</small><p>“The team remembered we were celebrating, and the view from our room made the whole weekend feel special. I’d come back for that kind of care.”</p><footer>Example of a customer-owned review draft · Not a testimonial</footer></article>
          <article className="vr-feedback-card"><small>Illustrative feedback / fictional example</small><p>“We had to wait a little longer than expected, but the staff checked in with us and made sure everything was right by the end.”</p><footer>Example of balanced, honest feedback · Not a testimonial</footer></article>
        </div>
        <a href="#experience" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#bdcaff] hover:underline">Try the local preview <ArrowRight className="h-4 w-4" /></a>
      </div>
    </section>
  );
}