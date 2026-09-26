import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewTone } from "@workspace/api-client-react";
import { getReviewPageStrings } from "@/lib/reviewPageTranslations";
import { InteractiveReviewDemo } from "./review-demo";

vi.mock("@/components/brand-logo", () => ({ BrandLogo: () => <span>5-Star.AI</span> }));
vi.mock("@/lib/vcard", () => ({ downloadVCard: vi.fn() }));

const response = (body: unknown, status = 200): Response => ({
  ok: status < 400,
  status,
  text: async () => JSON.stringify(body),
}) as Response;

beforeEach(() => {
  Object.defineProperty(window, "umami", {
    configurable: true,
    value: { track: vi.fn() },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ reviewText: "A genuine draft." })));
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  vi.stubGlobal("crypto", { randomUUID: () => "fixed-session" });
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("open", vi.fn());
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});
afterEach(() => {
  cleanup();
  delete (window as Window & { umami?: unknown }).umami;
  vi.unstubAllGlobals();
});

async function chooseRating(value = 4) {
  await userEvent.click(screen.getByRole("radio", { name: `${value} stars` }));
}
async function generate() {
  await userEvent.click(screen.getByRole("button", { name: /generate/i }));
}

describe("single live customer demo", () => {
  it("sends the exact public request, all selected context, and no request on mount", async () => {
    render(<InteractiveReviewDemo />);
    expect(screen.getByRole("heading", { name: "From a real moment to your own words.", level: 3 })).toBeInTheDocument();
    expect(screen.getAllByText("Fictional demo business")).toHaveLength(2);
    expect(screen.getByText(/Fictional sample business and details, not a customer endorsement/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Directions" })).toHaveAttribute("href", expect.stringContaining("google.com/maps/dir"));
    expect(screen.getByRole("link", { name: "Website" })).toHaveAttribute("href", "https://www.marinabaysands.com/");
    expect(fetch).not.toHaveBeenCalled();
    await chooseRating();
    await userEvent.click(screen.getByRole("button", { name: "Beautiful views" }));
    expect(screen.getByRole("button", { name: "Beautiful views" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.type(screen.getByRole("textbox", { name: /Mention a team member/i }), "  Skyline  ");
    await userEvent.type(screen.getByRole("textbox", { name: /your name/i }), "  Sam  ");
    await userEvent.type(screen.getByRole("textbox", { name: /occasion/i }), "  Holiday  ");
    await generate();
    await screen.findByRole("textbox", { name: "Generated Google review" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/v1/public/demo-review/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "landing-demo-fixed-session",
        keywords: ["Beautiful views"],
        rating: 4,
        tone: ReviewTone.WARM,
        language: "en",
        mentionDetail: "Skyline",
        customerName: "Sam",
        occasion: "Holiday",
      }),
    });
    expect(screen.getByText(/Nothing is posted automatically/)).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Google Maps" })).toHaveAttribute("href", expect.stringContaining("search.google.com/local/writereview"));
  });

  it("tracks only draft outcome and Google handoff, never the draft or form inputs", async () => {
    render(<InteractiveReviewDemo />);
    await chooseRating();
    await userEvent.type(screen.getByRole("textbox", { name: /your name/i }), "Private name");
    await generate();
    await screen.findByRole("textbox", { name: "Generated Google review" });
    expect(window.umami?.track).toHaveBeenCalledWith("demo_draft_generation", { outcome: "success" });

    await userEvent.click(screen.getByRole("button", { name: /copy and continue/i }));
    expect(window.umami?.track).toHaveBeenCalledWith("demo_google_handoff");
    expect(window.umami?.track).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["Enthusiastic", ReviewTone.ENTHUSIASTIC],
    ["Short", ReviewTone.SHORT_DIRECT],
    ["Detailed", ReviewTone.DETAILED],
    ["Warm", ReviewTone.WARM],
  ])("submits the %s tone without changing the other payload fields", async (label, value) => {
    render(<InteractiveReviewDemo />);
    await chooseRating();
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}(?: &.*)?$`, "i") }));
    await generate();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toMatchObject({
      tone: value, keywords: [], mentionDetail: null, customerName: null, occasion: null,
    });
  });

  it("supports roving radio arrows, language selection and RTL form direction", async () => {
    const { container } = render(<InteractiveReviewDemo />);
    const first = screen.getByRole("radio", { name: "1 star" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "5 stars" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "5 stars" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Choose language" }));
    await userEvent.click(screen.getByRole("option", { name: /Urdu/i }));
    expect(container.querySelector("section[dir='rtl']")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: getReviewPageStrings("ur").generateButton }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).language).toBe("ur");
  });

  it.each([
    ["server", () => response({ message: "Too many requests" }, 429), "Too many requests"],
    ["empty", () => response({ reviewText: "   " }), "temporarily unavailable"],
    ["null", () => response(null), "invalid response"],
    ["invalid", () => ({ ok: true, text: async () => "<invalid>" }) as Response, "invalid response"],
    ["network", () => Promise.reject(new Error("Network unavailable")), "Network unavailable"],
  ])("retains inputs and recovers after %s failure", async (_case, failed, message) => {
    const track = window.umami!.track;
    vi.mocked(fetch).mockImplementationOnce(async () => failed());
    render(<InteractiveReviewDemo />);
    await chooseRating();
    await userEvent.type(screen.getByRole("textbox", { name: /Mention a team member/i }), "My visit");
    await generate();
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(track).toHaveBeenCalledWith("demo_draft_generation", { outcome: "failure" });
    expect(screen.getByRole("textbox", { name: /Mention a team member/i })).toHaveValue("My visit");
    await generate();
    expect(await screen.findByRole("textbox", { name: "Generated Google review" })).toHaveValue("A genuine draft.");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("guards repeated submissions and retains the draft while inactive", async () => {
    let resolve!: (value: ReturnType<typeof response>) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; }));
    const status = vi.fn();
    const { rerender } = render(<InteractiveReviewDemo onStatusChange={status} />);
    await chooseRating();
    await generate();
    expect(screen.getByRole("button", { name: /writing your review/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /writing your review/i }));
    rerender(<InteractiveReviewDemo active={false} onStatusChange={status} />);
    resolve(response({ reviewText: "Retained draft" }));
    await waitFor(() => expect(status).toHaveBeenCalledWith(expect.stringContaining("draft is ready")));
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    rerender(<InteractiveReviewDemo active onStatusChange={status} />);
    expect(await screen.findByRole("textbox", { name: "Generated Google review" })).toHaveValue("Retained draft");
    await userEvent.clear(screen.getByRole("textbox", { name: "Generated Google review" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Generated Google review" }), "Edited draft");
    rerender(<InteractiveReviewDemo active={false} onStatusChange={status} />);
    rerender(<InteractiveReviewDemo active onStatusChange={status} />);
    expect(screen.getByRole("textbox", { name: "Generated Google review" })).toHaveValue("Edited draft");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("announces copy success/failure without pretending a failed copy worked; reset is explicit", async () => {
    render(<InteractiveReviewDemo />);
    await chooseRating();
    await generate();
    await screen.findByRole("textbox", { name: "Generated Google review" });
    await userEvent.click(screen.getByRole("button", { name: "Copy draft" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("A genuine draft.");
    expect(screen.getByRole("status")).toHaveTextContent("Draft copied");
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("Denied"));
    await userEvent.click(screen.getByRole("button", { name: /copy and continue/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Select the draft text");
    expect(screen.getByRole("textbox", { name: "Generated Google review" })).toHaveValue("A genuine draft.");
    await userEvent.click(screen.getByRole("button", { name: /regenerate/i }));
    expect(screen.queryByRole("textbox", { name: "Generated Google review" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("radiogroup")).getByRole("radio", { name: "4 stars" })).toHaveAttribute("aria-checked", "true");
  });
});