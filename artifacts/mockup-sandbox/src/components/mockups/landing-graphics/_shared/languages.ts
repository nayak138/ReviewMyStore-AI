// English plus the 22 languages scheduled in the Constitution of India.
// Codes must match the `SupportedLanguage` enum in lib/api-spec/openapi.yaml
// and the display-name map in
// artifacts/api-server/src/services/promptService.ts.
export interface LanguageOption {
  code: string;
  /** English name, shown as a secondary label. */
  englishName: string;
  /** Name in the language's own script — what's shown as the primary label. */
  nativeName: string;
  rtl?: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", englishName: "Bengali", nativeName: "বাংলা" },
  { code: "te", englishName: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", englishName: "Marathi", nativeName: "मराठी" },
  { code: "ta", englishName: "Tamil", nativeName: "தமிழ்" },
  { code: "ur", englishName: "Urdu", nativeName: "اردو", rtl: true },
  { code: "gu", englishName: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", englishName: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", englishName: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", englishName: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "or", englishName: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "as", englishName: "Assamese", nativeName: "অসমীয়া" },
  { code: "mai", englishName: "Maithili", nativeName: "मैथिली" },
  { code: "sat", englishName: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { code: "ks", englishName: "Kashmiri", nativeName: "کٲشُر", rtl: true },
  { code: "ne", englishName: "Nepali", nativeName: "नेपाली" },
  { code: "sd", englishName: "Sindhi", nativeName: "سنڌي", rtl: true },
  { code: "kok", englishName: "Konkani", nativeName: "कोंकणी" },
  { code: "doi", englishName: "Dogri", nativeName: "डोगरी" },
  { code: "mni", englishName: "Manipuri", nativeName: "মৈতৈলোন্" },
  { code: "sa", englishName: "Sanskrit", nativeName: "संस्कृतम्" },
  { code: "brx", englishName: "Bodo", nativeName: "बड़ो" },
];

const LANGUAGE_BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

export function getLanguage(code: string | null | undefined): LanguageOption {
  return (code && LANGUAGE_BY_CODE.get(code)) || LANGUAGE_BY_CODE.get("en")!;
}

export function isRtlLanguage(code: string | null | undefined): boolean {
  return Boolean(getLanguage(code).rtl);
}
