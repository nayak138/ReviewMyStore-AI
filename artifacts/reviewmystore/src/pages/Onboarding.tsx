import { useEffect, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateBusiness, useGetDashboardSummary, useGetPlaceDetails, getGetDashboardSummaryQueryKey, getGetPlaceDetailsQueryKey, type PlaceAutocompleteSuggestion } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { BusinessSearch } from "@/components/business-search";
import { loadSelectedPlace, clearSelectedPlace, placePhotoUrl, type SelectedPlace } from "@/lib/selected-place";
import { Store, Loader2, ArrowRight, MapPin, Star, PenLine, Search } from "lucide-react";

const onboardingSchema = z.object({
  name: z.string().min(2, "Name is required"),
  category: z.string().min(2, "Category is required"),
  googlePlaceId: z.string().nullable().optional(),
  slug: z.string().min(2, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only"),
  logoUrl: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  brandColor: z.string().optional(),
  welcomeMessage: z.string().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  googleRating: z.number().nullable().optional(),
  googleReviewCount: z.number().nullable().optional(),
  placeImageUrl: z.string().nullable().optional(),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

const EMPTY_VALUES: OnboardingValues = {
  name: "",
  category: "",
  googlePlaceId: "",
  slug: "",
  logoUrl: null,
  coverImageUrl: null,
  brandColor: "#3b82f6",
  welcomeMessage: "Thank you for your visit! We'd love to hear your feedback.",
  address: null,
  phone: null,
  website: null,
  instagramUrl: null,
  facebookUrl: null,
  whatsappNumber: null,
  latitude: null,
  longitude: null,
  googleRating: null,
  googleReviewCount: null,
  placeImageUrl: null,
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function Onboarding() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // "search" = smart Google Places lookup step, "form" = the actual business details form
  const [step, setStep] = useState<"search" | "form">("search");
  const [prefilledFrom, setPrefilledFrom] = useState<SelectedPlace | null>(null);

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: {
      enabled: isLoaded && isSignedIn,
      queryKey: getGetDashboardSummaryQueryKey(),
    }
  });

  const createBusiness = useCreateBusiness();

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: EMPTY_VALUES,
  });

  // If the user picked a business on the landing page, jump straight to a
  // pre-filled form once we land here after sign-up.
  useEffect(() => {
    const place = loadSelectedPlace();
    if (place) {
      applyPlace(place);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically generate slug from name (only while the user hasn't touched it)
  const watchName = form.watch("name");
  useEffect(() => {
    if (watchName && !form.formState.touchedFields.slug) {
      form.setValue("slug", slugify(watchName), { shouldValidate: true });
    }
  }, [watchName, form]);

  function applyPlace(place: SelectedPlace) {
    setPrefilledFrom(place);
    form.reset({
      ...EMPTY_VALUES,
      name: place.name,
      category: place.category || "",
      googlePlaceId: place.placeId,
      slug: slugify(place.name),
      brandColor: EMPTY_VALUES.brandColor,
      welcomeMessage: EMPTY_VALUES.welcomeMessage,
      address: place.formattedAddress,
      phone: place.phone,
      website: place.website,
      latitude: place.latitude,
      longitude: place.longitude,
      googleRating: place.rating,
      googleReviewCount: place.userRatingCount,
      placeImageUrl: place.photoName ? placePhotoUrl(place.photoName, 800) : null,
    });
    clearSelectedPlace();
    setStep("form");
  }

  const [pendingPlaceId, setPendingPlaceId] = useState<string | null>(null);
  const handleSuggestionSelect = (suggestion: PlaceAutocompleteSuggestion) => {
    setPendingPlaceId(suggestion.placeId);
  };

  const { data: pendingDetails, isLoading: isLoadingPendingDetails } = useGetPlaceDetails(pendingPlaceId ?? "", {
    query: { enabled: !!pendingPlaceId, queryKey: getGetPlaceDetailsQueryKey(pendingPlaceId ?? "") },
  });

  useEffect(() => {
    if (pendingDetails && pendingPlaceId) {
      applyPlace({
        placeId: pendingDetails.placeId,
        name: pendingDetails.name,
        category: pendingDetails.category,
        formattedAddress: pendingDetails.formattedAddress,
        phone: pendingDetails.phone,
        website: pendingDetails.website,
        latitude: pendingDetails.latitude,
        longitude: pendingDetails.longitude,
        rating: pendingDetails.rating,
        userRatingCount: pendingDetails.userRatingCount,
        photoName: pendingDetails.photoName,
      });
      setPendingPlaceId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDetails, pendingPlaceId]);

  const handleManualEntry = () => {
    setPrefilledFrom(null);
    form.reset(EMPTY_VALUES);
    setStep("form");
  };

  const handleSearchAgain = () => {
    setPrefilledFrom(null);
    form.reset(EMPTY_VALUES);
    setStep("search");
  };

  if (!isLoaded || isLoadingSummary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  // If they don't need onboarding, redirect to dashboard
  if (summary && !summary.needsOnboarding) {
    return <Redirect to="/dashboard" />;
  }

  const onSubmit = async (data: OnboardingValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createBusiness.mutateAsync({ data });
      setLocation("/dashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left visual column */}
      <div className="hidden lg:flex flex-col flex-1 bg-card border-r border-border p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 pattern-grid-lg opacity-50 mix-blend-multiply" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-16">
            <img src={`${import.meta.env.BASE_URL}brand/logo-icon.png`} alt="Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-xl tracking-tight text-foreground">ReviewMyStore</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6">
            Let's set up your first location.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            ReviewMyStore works best when we know a little bit about your business. You can add more locations later from your dashboard.
          </p>

          <div className="mt-16 space-y-6">
            <div className={`flex items-center gap-4 p-4 rounded-xl border shadow-sm ${step === "search" ? "text-foreground bg-background/50 border-border/50" : "text-muted-foreground/50"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${step === "search" ? "bg-primary/10" : "bg-secondary"}`}>
                <Search className={`w-5 h-5 ${step === "search" ? "text-primary" : ""}`} />
              </div>
              <div>
                <h3 className="font-semibold">1. Find Your Business</h3>
                <p className="text-sm">Search Google, or enter details manually</p>
              </div>
            </div>
            <div className={`flex items-center gap-4 p-4 rounded-xl border shadow-sm ${step === "form" ? "text-foreground bg-background/50 border-border/50" : "text-muted-foreground/50"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${step === "form" ? "bg-primary/10" : "bg-secondary"}`}>
                <Store className={`w-5 h-5 ${step === "form" ? "text-primary" : ""}`} />
              </div>
              <div>
                <h3 className="font-semibold">2. Confirm Details</h3>
                <p className="text-sm">Name, category, and branding</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground/50 p-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold">3</span>
              </div>
              <div>
                <h3 className="font-semibold">Start Collecting</h3>
                <p className="text-sm">Generate QR codes and get reviews</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form column */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 lg:px-16 overflow-y-auto">
        <div className="max-w-xl w-full mx-auto">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src={`${import.meta.env.BASE_URL}brand/logo-icon.png`} alt="Logo" className="w-6 h-6 rounded-md" />
            <span className="font-bold text-lg tracking-tight">ReviewMyStore</span>
          </div>

          {step === "search" ? (
            <div>
              <h2 className="text-2xl font-bold mb-2">Find your business</h2>
              <p className="text-muted-foreground mb-8">
                Search Google to automatically pull your name, category, and photo.
              </p>

              <BusinessSearch onSelect={handleSuggestionSelect} autoFocus />

              {isLoadingPendingDetails && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching business details...
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-border text-center">
                <button
                  type="button"
                  onClick={handleManualEntry}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                >
                  <PenLine className="w-4 h-4" />
                  Can't find it? Enter details manually
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">Business Details</h2>
                <button
                  type="button"
                  onClick={handleSearchAgain}
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" /> Search again
                </button>
              </div>
              <p className="text-muted-foreground mb-6">Tell us about your main storefront.</p>

              {prefilledFrom && (
                <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
                  {prefilledFrom.photoName ? (
                    <img src={placePhotoUrl(prefilledFrom.photoName, 96)} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm text-foreground">
                    Pre-filled from Google for <strong>{prefilledFrom.name}</strong>
                    {typeof prefilledFrom.rating === "number" && (
                      <span className="inline-flex items-center gap-1 ml-2 text-muted-foreground">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {prefilledFrom.rating.toFixed(1)}
                      </span>
                    )}
                    . Review and adjust anything below.
                  </p>
                </div>
              )}

              {submitError && (
                <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Daily Grind Coffee" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Cafe, Salon, Clinic" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Slug</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <div className="bg-secondary border border-border border-r-0 px-3 py-2 rounded-l-md text-sm text-muted-foreground flex items-center">
                                /store/
                              </div>
                              <Input className="rounded-l-none" placeholder="e.g. daily-grind" {...field} />
                            </div>
                          </FormControl>
                          <FormDescription>Used for your review links.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="googlePlaceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google Place ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional — filled in automatically when you search" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormDescription>Find this on Google Maps, or search above.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-lg font-semibold">Branding (Optional)</h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logo</FormLabel>
                            <FormControl>
                              <FileUpload
                                visibility="public"
                                className="h-32" 
                                placeholder="Upload Logo" 
                                value={field.value} 
                                onChange={field.onChange} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="coverImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cover Image</FormLabel>
                            <FormControl>
                              <FileUpload
                                visibility="public"
                                className="h-32" 
                                placeholder="Upload Cover" 
                                value={field.value} 
                                onChange={field.onChange} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="brandColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand Color</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input 
                                  type="color" 
                                  className="w-12 h-10 p-1 cursor-pointer" 
                                  {...field} 
                                />
                                <Input 
                                  type="text" 
                                  className="flex-1" 
                                  placeholder="#000000" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="welcomeMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Welcome Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Thank you for your visit..." 
                              className="resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>Shown to customers when they scan your QR code.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-lg font-semibold">Socials (Optional)</h3>
                    <p className="text-sm text-muted-foreground -mt-2">
                      Shown as icon buttons on your public review page and included in the downloadable contact card.
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 555 123 4567" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://yourbusiness.com" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="instagramUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input placeholder="https://instagram.com/yourbusiness" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="facebookUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facebook</FormLabel>
                            <FormControl>
                              <Input placeholder="https://facebook.com/yourbusiness" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="whatsappNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 555 123 4567" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>Customers tap the WhatsApp icon to message you directly.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <>
                          Create Business
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
