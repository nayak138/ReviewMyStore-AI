import { useRef, useState, type KeyboardEvent } from "react";
import { Check, Copy, MapPin, Pencil, RotateCcw, Sparkles, Star } from "lucide-react";
import { LanguageSelector } from "../_shared/LanguageSelector";
import { isRtlLanguage } from "../_shared/languages";
import { getReviewPageStrings } from "../_shared/reviewPageTranslations";

const image = "/__mockup/images/landing-graphics/marina-bay-sands-singapore.jpg";
const highlights = ["Beautiful views", "Warm hospitality", "Elegant rooms", "Great location"];
const tones = [
  { value: "ENTHUSIASTIC", key: "toneEnthusiastic" },
  { value: "SHORT_DIRECT", key: "toneShort" },
  { value: "DETAILED", key: "toneDetailed" },
  { value: "WARM", key: "toneWarm" },
] as const;
type Tone = typeof tones[number]["value"];

export function InteractiveReviewDemo({ onStatusChange }: { active?: boolean; onStatusChange?: (message: string) => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [tone, setTone] = useState<Tone>("WARM");
  const [language, setLanguage] = useState("en");
  const [detail, setDetail] = useState("");
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const ratingRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const strings = getReviewPageStrings(language);
  const rtl = isRtlLanguage(language);

  function moveRating(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const next = event.key === "Home" ? 1 : event.key === "End" ? 5 :
      event.key === "ArrowRight" || event.key === "ArrowUp" ? current % 5 + 1 :
      event.key === "ArrowLeft" || event.key === "ArrowDown" ? (current + 3) % 5 + 1 : null;
    if (next === null) return;
    event.preventDefault();
    setRating(next);
    ratingRefs.current[next - 1]?.focus();
  }
  function generate() {
    if (!rating) return;
    const detailPart = detail.trim() ? ` I especially appreciated ${detail.trim()}.` : "";
    const occasionPart = occasion.trim() ? ` During ${occasion.trim()},` : "";
    const ending = tone === "SHORT_DIRECT" ? " Thank you!" : tone === "ENTHUSIASTIC" ? " I really enjoyed my visit!" : tone === "DETAILED" ? " The team made the visit memorable." : " Thank you to the team.";
    setDraft(`Local sample draft — please replace this with your own genuine experience.${occasionPart} I visited Marina Bay Sands Singapore. My ${rating}-star impression included ${selected.length ? selected.join(", ").toLowerCase() : "the experience"}.${detailPart}${ending}${name.trim() ? ` — ${name.trim()}` : ""}`);
    setCopied(false);
    setError("");
    onStatusChange?.("Editable local sample draft ready. Switch back to Customer View to review it.");
  }
  async function copy() {
    if (!draft?.trim()) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setError("");
      onStatusChange?.("Local sample draft copied. Google handoff is disabled in this design preview.");
    } catch {
      setError("Clipboard access is unavailable. Select the draft text and copy it manually.");
    }
  }
  const fieldClass = "mt-2 w-full min-w-0 rounded-xl border px-3.5 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
  return (
    <section id="review-demo" aria-label="Interactive local review draft preview">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mk-eyebrow">Try the flow yourself</p>
          <h3 className="mt-2 font-display text-2xl font-bold sm:text-3xl">From a real moment to your own words.</h3>
        </div>
        <span className="rounded-full border border-[#6474ab] px-3 py-1.5 text-xs font-semibold text-[#c8d2ff]">Local-only design preview</span>
      </div>
      <div className="vr-demo-frame">
        <div className="vr-demo-media">
          <header className="relative overflow-hidden bg-[#1a2847]">
            <img src={image} alt="Exterior of Marina Bay Sands Singapore" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1025] via-[#0a1025]/20 to-[#0a1025]/25" />
            <div className="absolute right-3 top-3 z-10"><LanguageSelector value={language} onChange={setLanguage} /></div>
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#d4dcff]">Illustrative hotel experience</p>
              <h3 className="font-display text-2xl font-bold sm:text-3xl">Marina Bay Sands Singapore</h3>
              <p className="mt-2 flex items-center gap-1 text-xs text-[#e1e7f6]"><MapPin className="h-3 w-3" />10 Bayfront Avenue, Singapore</p>
            </div>
          </header>
          <p className="mt-4 px-1 text-xs leading-relaxed text-[#acbad5]">Illustrative local sample, not a customer endorsement. No requests or Google posting happen in this design preview. Only submit a review based on a genuine visit.</p>
        </div>
        <div className="vr-demo-form" dir={rtl ? "rtl" : "ltr"}>
          {draft === null ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-indigo-700">01 / Your experience</p>
              <h4 className="mt-2 font-display text-xl font-bold sm:text-2xl">{strings.ratingQuestion}</h4>
              <div className="mt-3 flex flex-wrap gap-1" role="radiogroup" aria-label={strings.ratingQuestion}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} ref={(node) => { ratingRefs.current[value - 1] = node; }} type="button" role="radio" aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-checked={rating === value} tabIndex={rating === value || (!rating && value === 1) ? 0 : -1} onKeyDown={(event) => moveRating(event, value)} onClick={() => setRating(value)} className="grid h-11 w-11 place-items-center rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500">
                    <Star className={`h-8 w-8 ${rating && value <= rating ? "fill-[#f5b544] text-[#f5b544]" : "text-[#8795b2]"}`} />
                  </button>
                ))}
              </div>
              <div className="my-5 border-t border-[#d6deee]" />
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-indigo-700">02 / What stood out</p>
              <h4 className="mt-2 font-display text-xl font-bold">{strings.highlightsTitle}</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {highlights.map((item) => <button key={item} type="button" aria-pressed={selected.includes(item)} onClick={() => setSelected((current) => current.includes(item) ? current.filter((x) => x !== item) : [...current, item])} className={`min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors ${selected.includes(item) ? "border-[#394caa] bg-[#394caa] text-white" : "border-[#bcc9e0] bg-white text-[#263554] hover:border-[#394caa]"}`}>{item}</button>)}
              </div>
              <label className="mt-4 block text-sm font-medium">{strings.mentionLabel}<input className={fieldClass} value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={60} placeholder={strings.mentionPlaceholder} /></label>
              <div className="my-5 border-t border-[#d6deee]" />
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-indigo-700">03 / Make it yours</p>
              <h4 className="mt-2 font-display text-xl font-bold">{strings.toneTitle}</h4>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {tones.map((option) => <button key={option.value} type="button" aria-pressed={tone === option.value} onClick={() => setTone(option.value)} className={`min-h-11 rounded-xl border px-2 py-2 text-left text-sm font-medium ${tone === option.value ? "border-[#394caa] bg-[#e6eaff] text-[#1b3070]" : "border-[#c5d0e3] bg-white text-[#263554]"}`}>{strings[option.key]}</button>)}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="min-w-0 text-sm font-medium">{strings.namePlaceholder}<input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder={strings.namePlaceholder} /></label>
                <label className="min-w-0 text-sm font-medium">{strings.occasionPlaceholder}<input className={fieldClass} value={occasion} onChange={(event) => setOccasion(event.target.value)} maxLength={60} placeholder={strings.occasionPlaceholder} /></label>
              </div>
              <button type="button" disabled={!rating} onClick={generate} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3449b0] px-4 text-sm font-bold text-white hover:bg-[#243992] disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-4 w-4" />{strings.generateButton}</button>
              <p className="mt-3 text-center text-xs text-[#5e6b83]">Local sample only. Nothing is posted automatically.</p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-indigo-700">Your words, your choice</p>
              <h4 className="mt-2 font-display text-2xl font-bold">Your local sample draft is ready.</h4>
              <label className="mt-5 block text-sm font-medium"><span className="flex items-center gap-2"><Pencil className="h-4 w-4" />Edit your draft</span><textarea value={draft} onChange={(event) => { setDraft(event.target.value); setCopied(false); }} rows={8} className={`${fieldClass} resize-y leading-relaxed`} /></label>
              <p className="mt-3 text-sm leading-relaxed text-[#53617c]">This draft is yours to edit or discard. Nothing is posted automatically. Google may ask you to sign in before you publish.</p>
              {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
              <button type="button" onClick={() => void copy()} disabled={!draft.trim()} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3449b0] px-4 text-sm font-bold text-white disabled:opacity-50">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? strings.copiedLabel : "Copy draft"}</button>
              <p className="mt-2 text-center text-xs text-[#53617c]">Google handoff disabled in this design preview.</p>
              <button type="button" onClick={() => { setDraft(null); setCopied(false); setError(""); }} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-[#3449b0]"><RotateCcw className="h-4 w-4" />{strings.regenerateButton}</button>
            </>
          )}
        </div>
      </div>
      <p className="vr-demo-footer text-center text-xs">Design preview · Customer inputs stay in place when you switch views.</p>
    </section>
  );
}