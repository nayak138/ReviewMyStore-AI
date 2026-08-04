/**
 * Built-in campaign starting points shown during onboarding and when
 * creating a new campaign. Static and in-code (not a DB table) because the
 * list is curated content, not tenant data — it never needs per-org
 * customization or admin CRUD in the MVP.
 */
export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  productServiceKeywords: string[];
  experienceKeywords: string[];
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "restaurant_table",
    name: "Restaurant / Cafe Table",
    description: "A table-tent or receipt QR code prompting diners to review their meal.",
    productServiceKeywords: ["Great Food", "Generous Portions", "Fresh Ingredients", "Delicious Coffee"],
    experienceKeywords: ["Friendly Staff", "Fast Service", "Cozy Atmosphere", "Clean Space"],
  },
  {
    id: "salon_reception",
    name: "Salon / Spa Reception",
    description: "An NFC tag at checkout for salons, spas, and barbershops.",
    productServiceKeywords: ["Great Haircut", "Relaxing Massage", "Quality Products", "Skilled Stylist"],
    experienceKeywords: ["Friendly Staff", "On Time", "Clean Facility", "Comfortable Chairs"],
  },
  {
    id: "retail_checkout",
    name: "Retail Checkout",
    description: "A QR code at the register for shops and boutiques.",
    productServiceKeywords: ["Great Selection", "Good Prices", "Quality Products", "Easy Returns"],
    experienceKeywords: ["Helpful Staff", "Fast Checkout", "Clean Store", "Easy to Find Items"],
  },
  {
    id: "gym_frontdesk",
    name: "Gym / Fitness Studio",
    description: "A front-desk or locker-room QR code for gyms and studios.",
    productServiceKeywords: ["Great Equipment", "Clean Facility", "Good Classes", "Knowledgeable Trainers"],
    experienceKeywords: ["Friendly Staff", "Motivating Atmosphere", "Convenient Hours", "Easy Parking"],
  },
  {
    id: "hotel_checkout",
    name: "Hotel Checkout",
    description: "A checkout-desk or room-card QR code for hotels and B&Bs.",
    productServiceKeywords: ["Comfortable Room", "Clean Room", "Great Amenities", "Good Breakfast"],
    experienceKeywords: ["Friendly Staff", "Smooth Check-in", "Quiet Stay", "Great Location"],
  },
  {
    id: "clinic_checkout",
    name: "Clinic / Medical Office",
    description: "A checkout-desk QR code for clinics, dental, and medical offices.",
    productServiceKeywords: ["Thorough Exam", "Clear Explanation", "Effective Treatment", "Modern Equipment"],
    experienceKeywords: ["Friendly Staff", "Short Wait", "Clean Office", "Easy Scheduling"],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Start from a blank campaign and add your own keywords.",
    productServiceKeywords: [],
    experienceKeywords: [],
  },
];
