import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Store, 
  Plus, 
  MoreVertical, 
  Pencil, 
  Archive, 
  ArchiveRestore,
  Trash2, 
  MapPin,
  Search,
  ExternalLink,
  Ban,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PenLine,
  Star
} from "lucide-react";
import { 
  useListBusinesses,
  useCreateBusiness,
  useUpdateBusiness,
  useDeleteBusiness,
  useArchiveBusiness,
  useRestoreBusiness,
  useSetBusinessStatus,
  useGetPlaceDetails,
  getListBusinessesQueryKey,
  getGetPlaceDetailsQueryKey,
  Business,
  type PlaceAutocompleteSuggestion
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { objectUrl } from "@/lib/imageUtils";
import { BusinessSearch } from "@/components/business-search";
import { placePhotoUrl } from "@/lib/selected-place";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";

const businessSchema = z.object({
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

type BusinessFormValues = z.infer<typeof businessSchema>;

const EMPTY_BUSINESS_VALUES: BusinessFormValues = {
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

export default function Businesses() {
  const { isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  // Create-flow only: "search" = Google Places lookup, "form" = confirm/edit details
  const [createStep, setCreateStep] = useState<"search" | "form">("search");
  const [prefilledFrom, setPrefilledFrom] = useState<{ name: string; rating?: number | null; photoName?: string | null } | null>(null);
  const [pendingPlaceId, setPendingPlaceId] = useState<string | null>(null);
  
  // Confirmation Dialog States
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    variant: "default" | "destructive";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    actionLabel: "",
    variant: "default",
    onConfirm: () => {},
  });

  const { data, isLoading } = useListBusinesses({ includeArchived: true }, {
    query: {
      enabled: !!isSignedIn,
      queryKey: getListBusinessesQueryKey({ includeArchived: true }),
    }
  });

  const createBusiness = useCreateBusiness({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey({ includeArchived: true }) });
        setIsCreateModalOpen(false);
        toast({ title: "Business created", description: "Your new location has been added." });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const updateBusiness = useUpdateBusiness({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey({ includeArchived: true }) });
        setIsEditModalOpen(false);
        toast({ title: "Business updated", description: "The details have been saved." });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const archiveBusiness = useArchiveBusiness({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey({ includeArchived: true }) });
        toast({ title: "Business archived", description: "It will no longer accept new reviews." });
      }
    }
  });

  const restoreBusiness = useRestoreBusiness({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey({ includeArchived: true }) });
        toast({ title: "Business restored", description: "It is now active again." });
      }
    }
  });

  const deleteBusiness = useDeleteBusiness({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey({ includeArchived: true }) });
        toast({ title: "Business deleted", description: "The business has been removed." });
      }
    }
  });

  const setBusinessStatus = useSetBusinessStatus({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey({ includeArchived: true }) });
        toast({ title: "Status updated", description: `Business is now ${data.status.toLowerCase()}.` });
      }
    }
  });

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: EMPTY_BUSINESS_VALUES,
  });

  // Auto-generate the slug from the name while the user hasn't manually edited it.
  const watchName = form.watch("name");
  useEffect(() => {
    if ((isCreateModalOpen || isEditModalOpen) && watchName && !form.formState.touchedFields.slug) {
      form.setValue("slug", slugify(watchName), { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchName]);

  const handleOpenEdit = (business: Business) => {
    setEditingBusiness(business);
    form.reset({
      name: business.name,
      category: business.category,
      googlePlaceId: business.googlePlaceId || "",
      slug: business.slug,
      logoUrl: business.logoUrl,
      coverImageUrl: business.coverImageUrl,
      brandColor: business.brandColor || "#3b82f6",
      welcomeMessage: business.welcomeMessage || "",
      address: business.address,
      phone: business.phone,
      website: business.website,
      instagramUrl: business.instagramUrl,
      facebookUrl: business.facebookUrl,
      whatsappNumber: business.whatsappNumber,
      latitude: business.latitude,
      longitude: business.longitude,
      googleRating: business.googleRating,
      googleReviewCount: business.googleReviewCount,
      placeImageUrl: business.placeImageUrl,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    form.reset(EMPTY_BUSINESS_VALUES);
    setPrefilledFrom(null);
    setPendingPlaceId(null);
    setCreateStep("search");
    setIsCreateModalOpen(true);
  };

  const applyPlace = (place: {
    placeId: string;
    name: string;
    category?: string | null;
    formattedAddress?: string | null;
    phone?: string | null;
    website?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    rating?: number | null;
    userRatingCount?: number | null;
    photoName?: string | null;
  }) => {
    setPrefilledFrom({ name: place.name, rating: place.rating, photoName: place.photoName });
    form.reset({
      ...EMPTY_BUSINESS_VALUES,
      name: place.name,
      category: place.category || "",
      googlePlaceId: place.placeId,
      slug: slugify(place.name),
      address: place.formattedAddress ?? null,
      phone: place.phone ?? null,
      website: place.website ?? null,
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
      googleRating: place.rating ?? null,
      googleReviewCount: place.userRatingCount ?? null,
      placeImageUrl: place.photoName ? placePhotoUrl(place.photoName, 800) : null,
    });
    setCreateStep("form");
  };

  const handleSuggestionSelect = (suggestion: PlaceAutocompleteSuggestion) => {
    setPendingPlaceId(suggestion.placeId);
  };

  const { data: pendingDetails, isLoading: isLoadingPendingDetails } = useGetPlaceDetails(pendingPlaceId ?? "", {
    query: { enabled: !!pendingPlaceId, queryKey: getGetPlaceDetailsQueryKey(pendingPlaceId ?? "") },
  });

  useEffect(() => {
    if (pendingDetails && pendingPlaceId) {
      applyPlace(pendingDetails);
      setPendingPlaceId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDetails, pendingPlaceId]);

  const handleManualEntry = () => {
    setPrefilledFrom(null);
    form.reset(EMPTY_BUSINESS_VALUES);
    setCreateStep("form");
  };

  const handleSearchAgain = () => {
    setPrefilledFrom(null);
    form.reset(EMPTY_BUSINESS_VALUES);
    setCreateStep("search");
  };

  const onSubmit = (values: BusinessFormValues) => {
    if (isEditModalOpen && editingBusiness) {
      updateBusiness.mutate({ id: editingBusiness.id, data: values });
    } else {
      createBusiness.mutate({ data: values });
    }
  };

  const handleArchiveClick = (business: Business) => {
    setConfirmDialog({
      isOpen: true,
      title: "Archive Business",
      description: "Are you sure you want to archive this business? It will stop collecting new reviews.",
      actionLabel: "Archive",
      variant: "default",
      onConfirm: () => {
        archiveBusiness.mutate({ id: business.id });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteClick = (business: Business) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Business",
      description: "Are you sure you want to delete this business? This action cannot be undone.",
      actionLabel: "Delete",
      variant: "destructive",
      onConfirm: () => {
        deleteBusiness.mutate({ id: business.id });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  const businesses = data?.businesses || [];
  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = businesses.filter(b => !b.archivedAt && b.status === "ACTIVE").length;

  return (
    <AppLayout title="Businesses">
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading your locations…"
                : businesses.length === 0
                  ? "Add your first location to start collecting reviews."
                  : `${businesses.length} location${businesses.length === 1 ? "" : "s"} · ${activeCount} active`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search businesses..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card shadow-sm"
              />
            </div>
            <Button onClick={handleOpenCreate} className="shrink-0 shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
        </div>

        {/* Business List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex gap-4 items-start">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredBusinesses.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-xl">
              <div className="w-16 h-16 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mb-4">
                <Store className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">No businesses found</h3>
              <p className="text-muted-foreground mt-2 max-w-md">
                {searchQuery ? "Try adjusting your search terms." : "You haven't added any locations yet. Add your first business to start collecting reviews."}
              </p>
              {!searchQuery && (
                <Button onClick={handleOpenCreate} className="mt-6">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              )}
            </div>
          ) : (
            filteredBusinesses.map((business) => (
              <div 
                key={business.id} 
                className={cn(
                  "group rounded-xl border bg-card p-0 shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md",
                  business.archivedAt ? "opacity-70 border-dashed" : "border-border hover:border-primary/30"
                )}
              >
                {/* Cover Image Area */}
                <div className="h-24 w-full bg-secondary relative overflow-hidden shrink-0">
                  {business.coverImageUrl ? (
                    <img src={objectUrl(business.coverImageUrl)} alt="Cover" className="w-full h-full object-cover" />
                  ) : business.brandColor ? (
                    <div className="w-full h-full" style={{ backgroundColor: business.brandColor, opacity: 0.2 }} />
                  ) : null}
                  
                  <div className="absolute top-3 right-3">
                    {business.archivedAt ? (
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur">Archived</Badge>
                    ) : business.status === "ACTIVE" ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 backdrop-blur">Active</Badge>
                    ) : business.status === "SUSPENDED" ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 backdrop-blur">Suspended</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur">{business.status}</Badge>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 flex-1 flex flex-col">
                  {/* Logo intersecting cover — needs its own stacking context (relative + z-10),
                      otherwise the cover's `position: relative` box paints on top of it regardless
                      of DOM order, since positioned elements always paint after static ones. */}
                  <div className="relative z-10 flex justify-between items-start -mt-8 mb-3">
                    <div className="w-16 h-16 rounded-xl border-4 border-card bg-background flex items-center justify-center overflow-hidden shadow-sm">
                      {business.logoUrl ? (
                        <img src={objectUrl(business.logoUrl)} alt={business.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="mt-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenEdit(business)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit Details
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {!business.archivedAt && (
                            <DropdownMenuItem 
                              onClick={() => setBusinessStatus.mutate({ 
                                id: business.id, 
                                data: { status: business.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" } 
                              })}
                            >
                              {business.status === "ACTIVE" ? (
                                <><Ban className="w-4 h-4 mr-2" /> Suspend Location</>
                              ) : (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Activate Location</>
                              )}
                            </DropdownMenuItem>
                          )}
                          
                          {business.archivedAt ? (
                            <DropdownMenuItem onClick={() => restoreBusiness.mutate({ id: business.id })}>
                              <ArchiveRestore className="w-4 h-4 mr-2" /> Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleArchiveClick(business)}>
                              <Archive className="w-4 h-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive" 
                            onClick={() => handleDeleteClick(business)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg leading-tight truncate" title={business.name}>
                      {business.name}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center mt-1">
                      <MapPin className="w-3.5 h-3.5 mr-1" />
                      {business.category}
                    </p>
                  </div>
                  
                  <div className="mt-auto pt-6 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      /{business.slug}
                    </span>
                    <span>Created {new Date(business.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {isCreateModalOpen && createStep === "search" ? (
            <>
              <DialogHeader>
                <DialogTitle>Add New Location</DialogTitle>
                <DialogDescription>
                  Search Google to automatically pull the name, category, address, and photo.
                </DialogDescription>
              </DialogHeader>

              <div className="py-6">
                <BusinessSearch onSelect={handleSuggestionSelect} autoFocus inputClassName="h-12 text-sm" />

                {isLoadingPendingDetails && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching business details...
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-border text-center">
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

              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </>
          ) : (
          <>
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>{isEditModalOpen ? "Edit Location" : "Confirm Location Details"}</DialogTitle>
              {isCreateModalOpen && (
                <button
                  type="button"
                  onClick={handleSearchAgain}
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" /> Search again
                </button>
              )}
            </div>
            <DialogDescription>
              {isEditModalOpen ? "Update the details for this business location." : "Review and adjust anything pulled from Google, or fill it in yourself."}
            </DialogDescription>
          </DialogHeader>

          {prefilledFrom && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <div className="bg-secondary border border-border border-r-0 px-3 py-2 rounded-l-md text-sm text-muted-foreground flex items-center shrink-0">
                            /store/
                          </div>
                          <Input className="rounded-l-none" placeholder="e.g. daily-grind" {...field} />
                        </div>
                      </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-sm font-medium">Branding</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo</FormLabel>
                        <FormControl>
                          <FileUpload className="h-28" placeholder="Upload Logo" value={field.value} onChange={field.onChange} />
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
                          <FileUpload className="h-28" placeholder="Upload Cover" value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="brandColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2 max-w-[200px]">
                          <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} />
                          <Input type="text" className="flex-1" placeholder="#000000" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="welcomeMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Welcome Message</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Thank you for your visit..." className="resize-none" {...field} />
                      </FormControl>
                      <FormDescription>Shown to customers when they scan your QR code.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-sm font-medium">Socials</h4>
                <p className="text-xs text-muted-foreground -mt-2">
                  Shown as icon buttons on the public review page and included in the downloadable contact card.
                </p>
                <div className="grid grid-cols-2 gap-4">
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
                        <FormDescription>Customers tap the icon to message you directly.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border mt-6">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBusiness.isPending || updateBusiness.isPending}>
                  {createBusiness.isPending || updateBusiness.isPending ? "Saving..." : "Save Location"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
          </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className={cn("w-5 h-5", confirmDialog.variant === "destructive" ? "text-destructive" : "text-amber-500")} />
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button 
              variant={confirmDialog.variant} 
              onClick={confirmDialog.onConfirm}
              disabled={deleteBusiness.isPending || archiveBusiness.isPending}
            >
              {deleteBusiness.isPending || archiveBusiness.isPending ? "Processing..." : confirmDialog.actionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
