/**
 * Illustrative sample data for the homepage Business View. These are invented
 * fixtures — never customer results — and nothing here is fetched or published.
 */
export const SAMPLE_DATA_LABEL = "Sample data — not customer results";

export interface SampleReview {
  id: string;
  author: string;
  rating: number;
  age: string;
  text: string;
  suggestedReply: string;
}

export interface SampleBusiness {
  id: string;
  name: string;
  kind: string;
  campaign: string;
  activity: { label: string; value: number; note?: string }[];
  reviews: SampleReview[];
}

export const SAMPLE_BUSINESSES: SampleBusiness[] = [
  {
    id: "harbor-bakery",
    name: "Harbor Lane Bakery (sample)",
    kind: "Bakery · 1 location",
    campaign: "Counter QR — spring menu",
    activity: [
      { label: "QR scans", value: 138 },
      { label: "Drafts generated", value: 41 },
      { label: "Google redirects", value: 27, note: "A redirect is not a confirmed published review." },
    ],
    reviews: [
      {
        id: "hb-1",
        author: "Sample reviewer A.",
        rating: 5,
        age: "2 days ago",
        text: "The cardamom buns were still warm and the staff remembered my order from last week.",
        suggestedReply:
          "Thank you for coming back — we're glad the cardamom buns were fresh from the oven. See you at the counter soon.",
      },
      {
        id: "hb-2",
        author: "Sample reviewer M.",
        rating: 3,
        age: "5 days ago",
        text: "Great bread, but the Saturday line was long and slow.",
        suggestedReply:
          "Thanks for the honest note about Saturdays. We're adding a second till during the morning rush and hope your next visit is quicker.",
      },
    ],
  },
  {
    id: "northside-dental",
    name: "Northside Dental Studio (sample)",
    kind: "Clinic · 2 locations",
    campaign: "Front desk link — after visit",
    activity: [
      { label: "Link opens", value: 64 },
      { label: "Drafts generated", value: 19 },
      { label: "Google redirects", value: 12, note: "A redirect is not a confirmed published review." },
    ],
    reviews: [
      {
        id: "nd-1",
        author: "Sample reviewer R.",
        rating: 4,
        age: "1 day ago",
        text: "Clear explanation of the treatment plan. Parking was tricky.",
        suggestedReply:
          "Thank you for the kind words about your treatment plan. Parking is tight on weekdays — the side-street lot usually has space after 10am.",
      },
    ],
  },
  {
    id: "juniper-auto",
    name: "Juniper Auto Care (sample)",
    kind: "Garage · 1 location",
    campaign: "Invoice QR — service desk",
    activity: [
      { label: "QR scans", value: 52 },
      { label: "Drafts generated", value: 16 },
      { label: "Google redirects", value: 9, note: "A redirect is not a confirmed published review." },
    ],
    reviews: [
      {
        id: "ja-1",
        author: "Sample reviewer T.",
        rating: 5,
        age: "3 days ago",
        text: "They showed me the worn part before replacing it. Honest and quick.",
        suggestedReply:
          "We appreciate you taking the time to write this. Showing the part is standard for us — thanks for trusting the team.",
      },
    ],
  },
];
