import { useState, useEffect } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateBusiness, useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { Store, Loader2, ArrowRight } from "lucide-react";

const onboardingSchema = z.object({
  name: z.string().min(2, "Name is required"),
  category: z.string().min(2, "Category is required"),
  googlePlaceId: z.string().optional(),
  slug: z.string().min(2, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only"),
  logoUrl: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  brandColor: z.string().optional(),
  welcomeMessage: z.string().optional(),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: {
      enabled: isLoaded && isSignedIn,
      queryKey: getGetDashboardSummaryQueryKey(),
    }
  });

  const createBusiness = useCreateBusiness();

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      category: "",
      googlePlaceId: "",
      slug: "",
      logoUrl: null,
      coverImageUrl: null,
      brandColor: "#3b82f6",
      welcomeMessage: "Thank you for your visit! We'd love to hear your feedback.",
    },
  });

  // Automatically generate slug from name
  const watchName = form.watch("name");
  useEffect(() => {
    if (watchName && !form.formState.touchedFields.slug) {
      const slug = watchName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      form.setValue("slug", slug, { shouldValidate: true });
    }
  }, [watchName, form]);

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
    try {
      await createBusiness.mutateAsync({ data });
      setLocation("/dashboard");
    } catch (err) {
      console.error(err);
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
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight text-foreground">ReviewMyStore</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6">
            Let's set up your first location.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            ReviewMyStore works best when we know a little bit about your business. You can add more locations later from your dashboard.
          </p>

          <div className="mt-16 space-y-6">
            <div className="flex items-center gap-4 text-muted-foreground bg-background/50 p-4 rounded-xl border border-border/50 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">1. Store Details</h3>
                <p className="text-sm">Name, category, and online presence</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground/50 p-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold">2</span>
              </div>
              <div>
                <h3 className="font-semibold">Brand Identity</h3>
                <p className="text-sm">Logo and brand colors</p>
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
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo" className="w-6 h-6" />
            <span className="font-bold text-lg tracking-tight">ReviewMyStore</span>
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Business Details</h2>
          <p className="text-muted-foreground mb-8">Tell us about your main storefront.</p>

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
                          <Input className="rounded-l-none" placeholder="daily-grind" {...field} />
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
                        <Input placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>Find this on Google Maps.</FormDescription>
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
      </div>
    </div>
  );
}
