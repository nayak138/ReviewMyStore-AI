import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Plus,
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Link2,
  Copy,
  Check,
  Ban,
  CheckCircle2,
  AlertCircle,
  Tag,
  Sparkles,
  Loader2,
  Settings2,
} from "lucide-react";
import {
  useListBusinesses,
  useListCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useArchiveCampaign,
  useRestoreCampaign,
  useSetCampaignStatus,
  useListCampaignTemplates,
  useListKeywords,
  useCreateKeyword,
  useUpdateKeyword,
  useDeleteKeyword,
  getListBusinessesQueryKey,
  getListCampaignsQueryKey,
  getListCampaignTemplatesQueryKey,
  getListKeywordsQueryKey,
  Campaign,
  CampaignTemplate,
  Keyword,
  KeywordCategory,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_META: Record<Campaign["status"], { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-secondary text-muted-foreground border-border" },
  ACTIVE: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  DISABLED: { label: "Disabled", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  ARCHIVED: { label: "Archived", className: "bg-secondary text-muted-foreground border-border" },
};

function reviewLink(businessSlug: string, campaignSlug: string): string {
  return `${window.location.origin}/review/${businessSlug}/${campaignSlug}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard API unavailable; silently ignore
        }
      }}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

export default function Campaigns() {
  const { isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"custom" | "template">("custom");
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);

  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [keywordCampaign, setKeywordCampaign] = useState<Campaign | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    variant: "default" | "destructive";
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: "", actionLabel: "", variant: "default", onConfirm: () => {} });

  const { data: businessData, isLoading: isLoadingBusinesses } = useListBusinesses(
    { includeArchived: false },
    { query: { enabled: !!isSignedIn, queryKey: getListBusinessesQueryKey({ includeArchived: false }) } },
  );
  const businesses = useMemo(() => businessData?.businesses ?? [], [businessData]);

  useEffect(() => {
    if (!selectedBusinessId && businesses.length > 0) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId) ?? null;

  const campaignsQueryKey = getListCampaignsQueryKey({ businessId: selectedBusinessId ?? "", includeArchived: true });
  const { data: campaignData, isLoading: isLoadingCampaigns } = useListCampaigns(
    { businessId: selectedBusinessId ?? "", includeArchived: true },
    { query: { enabled: !!selectedBusinessId, queryKey: campaignsQueryKey } },
  );
  const campaigns = campaignData?.campaigns ?? [];

  const { data: templateData } = useListCampaignTemplates({
    query: { enabled: isCreateOpen, queryKey: getListCampaignTemplatesQueryKey() },
  });
  const templates = templateData?.templates ?? [];

  const invalidateCampaigns = () => queryClient.invalidateQueries({ queryKey: campaignsQueryKey });

  const createCampaign = useCreateCampaign({
    mutation: {
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });
  const createKeyword = useCreateKeyword();
  const updateCampaign = useUpdateCampaign({
    mutation: {
      onSuccess: () => {
        invalidateCampaigns();
        setEditingCampaign(null);
        toast({ title: "Campaign updated" });
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });
  const deleteCampaign = useDeleteCampaign({
    mutation: {
      onSuccess: () => {
        invalidateCampaigns();
        toast({ title: "Campaign deleted" });
      },
    },
  });
  const archiveCampaign = useArchiveCampaign({
    mutation: {
      onSuccess: () => {
        invalidateCampaigns();
        toast({ title: "Campaign archived" });
      },
    },
  });
  const restoreCampaign = useRestoreCampaign({
    mutation: {
      onSuccess: () => {
        invalidateCampaigns();
        toast({ title: "Campaign restored" });
      },
    },
  });
  const setCampaignStatus = useSetCampaignStatus({
    mutation: {
      onSuccess: (data) => {
        invalidateCampaigns();
        toast({ title: "Status updated", description: `Campaign is now ${data.status.toLowerCase()}.` });
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  const resetCreateDialog = () => {
    setCreateTab("custom");
    setCustomName("");
    setCustomDescription("");
    setSelectedTemplate(null);
    setTemplateName("");
  };

  const handleOpenCreate = () => {
    resetCreateDialog();
    setIsCreateOpen(true);
  };

  const handleCreateCustom = async () => {
    if (!selectedBusinessId || !customName.trim()) return;
    try {
      await createCampaign.mutateAsync({
        data: { businessId: selectedBusinessId, name: customName.trim(), description: customDescription.trim() || null },
      });
      invalidateCampaigns();
      setIsCreateOpen(false);
      toast({ title: "Campaign created", description: `"${customName.trim()}" is ready to configure.` });
    } catch {
      // handled by onError
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedBusinessId || !selectedTemplate) return;
    const name = templateName.trim() || selectedTemplate.name;
    setIsCreatingFromTemplate(true);
    try {
      const campaign = await createCampaign.mutateAsync({
        data: { businessId: selectedBusinessId, name, description: selectedTemplate.description },
      });

      const keywordJobs: Promise<unknown>[] = [];
      selectedTemplate.productServiceKeywords.forEach((label, i) => {
        keywordJobs.push(
          createKeyword.mutateAsync({ campaignId: campaign.id, data: { label, category: KeywordCategory.PRODUCT_SERVICE, sortOrder: i } }),
        );
      });
      selectedTemplate.experienceKeywords.forEach((label, i) => {
        keywordJobs.push(
          createKeyword.mutateAsync({ campaignId: campaign.id, data: { label, category: KeywordCategory.EXPERIENCE, sortOrder: i } }),
        );
      });
      await Promise.all(keywordJobs);

      invalidateCampaigns();
      setIsCreateOpen(false);
      toast({
        title: "Campaign created from template",
        description: `Added ${keywordJobs.length} keyword${keywordJobs.length === 1 ? "" : "s"} to "${name}".`,
      });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create campaign from template.", variant: "destructive" });
    } finally {
      setIsCreatingFromTemplate(false);
    }
  };

  const handleOpenEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditName(campaign.name);
    setEditDescription(campaign.description ?? "");
  };

  const handleSaveEdit = () => {
    if (!editingCampaign) return;
    updateCampaign.mutate({ id: editingCampaign.id, data: { name: editName.trim(), description: editDescription.trim() || null } });
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Campaign",
      description: `Are you sure you want to delete "${campaign.name}"? This will remove its keywords and cannot be undone.`,
      actionLabel: "Delete",
      variant: "destructive",
      onConfirm: () => {
        deleteCampaign.mutate({ id: campaign.id });
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleArchiveClick = (campaign: Campaign) => {
    setConfirmDialog({
      isOpen: true,
      title: "Archive Campaign",
      description: `Archive "${campaign.name}"? Its review link will stop accepting new reviews.`,
      actionLabel: "Archive",
      variant: "default",
      onConfirm: () => {
        archiveCampaign.mutate({ id: campaign.id });
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  return (
    <AppLayout title="Campaigns">
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full sm:max-w-xs">
            {isLoadingBusinesses ? (
              <Skeleton className="h-9 w-full" />
            ) : businesses.length === 0 ? null : (
              <Select value={selectedBusinessId ?? ""} onValueChange={setSelectedBusinessId}>
                <SelectTrigger className="bg-card shadow-sm">
                  <SelectValue placeholder="Select a business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button onClick={handleOpenCreate} disabled={!selectedBusinessId} className="shrink-0 shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {!isLoadingBusinesses && businesses.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-xl">
            <div className="w-16 h-16 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mb-4">
              <Megaphone className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Add a business first</h3>
            <p className="text-muted-foreground mt-2 max-w-md">Campaigns belong to a business location. Add one from the Businesses page to get started.</p>
          </div>
        )}

        {/* Campaign List */}
        {selectedBusinessId && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingCampaigns ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))
            ) : campaigns.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-xl">
                <div className="w-16 h-16 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mb-4">
                  <Megaphone className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">No campaigns yet</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Create a campaign to start generating a shareable review page for {selectedBusiness?.name}.
                </p>
                <Button onClick={handleOpenCreate} className="mt-6">
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={cn(
                    "group rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-4 transition-all duration-200 hover:shadow-md",
                    campaign.archivedAt ? "opacity-70 border-dashed" : "border-border hover:border-primary/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg leading-tight truncate" title={campaign.name}>
                        {campaign.name}
                      </h3>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{campaign.description}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenEdit(campaign)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setKeywordCampaign(campaign)}>
                          <Tag className="w-4 h-4 mr-2" /> Manage Keywords
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {campaign.status === "ACTIVE" ? (
                          <DropdownMenuItem onClick={() => setCampaignStatus.mutate({ id: campaign.id, data: { status: "DISABLED" } })}>
                            <Ban className="w-4 h-4 mr-2" /> Disable
                          </DropdownMenuItem>
                        ) : campaign.status !== "ARCHIVED" ? (
                          <DropdownMenuItem onClick={() => setCampaignStatus.mutate({ id: campaign.id, data: { status: "ACTIVE" } })}>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Activate
                          </DropdownMenuItem>
                        ) : null}
                        {campaign.archivedAt ? (
                          <DropdownMenuItem onClick={() => restoreCampaign.mutate({ id: campaign.id })}>
                            <ArchiveRestore className="w-4 h-4 mr-2" /> Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleArchiveClick(campaign)}>
                            <Archive className="w-4 h-4 mr-2" /> Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(campaign)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <Badge variant="outline" className={cn("border", STATUS_META[campaign.status].className)}>
                      {campaign.archivedAt ? "Archived" : STATUS_META[campaign.status].label}
                    </Badge>
                  </div>

                  {selectedBusiness && (
                    <div className="mt-auto pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                        <Link2 className="w-3.5 h-3.5" /> Public review link
                      </div>
                      <div className="flex items-center gap-1 bg-secondary/60 rounded-md px-2 py-1.5">
                        <span className="text-xs text-foreground truncate flex-1 font-mono">
                          /review/{selectedBusiness.slug}/{campaign.slug}
                        </span>
                        <CopyButton value={reviewLink(selectedBusiness.slug, campaign.slug)} />
                      </div>
                      {campaign.status !== "ACTIVE" && (
                        <p className="text-[11px] text-muted-foreground mt-1.5">Activate this campaign so customers can use the link.</p>
                      )}
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full" onClick={() => setKeywordCampaign(campaign)}>
                    <Settings2 className="w-3.5 h-3.5 mr-2" /> Manage Keywords
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
            <DialogDescription>Campaigns generate a shareable review page with a curated list of talking points.</DialogDescription>
          </DialogHeader>

          <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as "custom" | "template")} className="mt-2">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="custom">Start from scratch</TabsTrigger>
              <TabsTrigger value="template">Use a template</TabsTrigger>
            </TabsList>

            <TabsContent value="custom" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input placeholder="e.g. Summer 2026 Promo" value={customName} onChange={(e) => setCustomName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea placeholder="What is this campaign for?" className="resize-none" value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} />
              </div>
              <DialogFooter className="pt-4 border-t border-border mt-6">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCustom} disabled={!customName.trim() || createCampaign.isPending}>
                  {createCampaign.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="template" className="space-y-4 pt-4">
              <div className="grid gap-3 max-h-72 overflow-y-auto pr-1">
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No templates available yet.</p>
                ) : (
                  templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(tpl);
                        setTemplateName(tpl.name);
                      }}
                      className={cn(
                        "text-left rounded-lg border p-4 transition-colors",
                        selectedTemplate?.id === tpl.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        <h4 className="font-medium">{tpl.name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{tpl.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {tpl.productServiceKeywords.length + tpl.experienceKeywords.length} suggested keywords
                      </p>
                    </button>
                  ))
                )}
              </div>

              {selectedTemplate && (
                <div className="space-y-2 pt-2">
                  <Label>Campaign Name</Label>
                  <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                </div>
              )}

              <DialogFooter className="pt-4 border-t border-border mt-6">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFromTemplate} disabled={!selectedTemplate || isCreatingFromTemplate}>
                  {isCreatingFromTemplate ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create from Template"
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={!!editingCampaign} onOpenChange={(open) => !open && setEditingCampaign(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea className="resize-none" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingCampaign(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim() || updateCampaign.isPending}>
              {updateCampaign.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyword Management Dialog */}
      {keywordCampaign && (
        <KeywordManagerDialog
          campaign={keywordCampaign}
          onClose={() => setKeywordCampaign(null)}
        />
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className={cn("w-5 h-5", confirmDialog.variant === "destructive" ? "text-destructive" : "text-amber-500")} />
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription className="pt-2">{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button variant={confirmDialog.variant} onClick={confirmDialog.onConfirm}>
              {confirmDialog.actionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function KeywordManagerDialog({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = getListKeywordsQueryKey(campaign.id);

  const { data, isLoading } = useListKeywords(campaign.id, { query: { queryKey } });
  const keywords = data?.keywords ?? [];

  const [newLabel, setNewLabel] = useState<Record<KeywordCategory, string>>({
    PRODUCT_SERVICE: "",
    EXPERIENCE: "",
  });
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createKeyword = useCreateKeyword({
    mutation: {
      onSuccess: () => invalidate(),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });
  const updateKeyword = useUpdateKeyword({
    mutation: {
      onSuccess: () => {
        invalidate();
        setEditingKeyword(null);
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });
  const deleteKeyword = useDeleteKeyword({
    mutation: { onSuccess: () => invalidate() },
  });

  const handleAdd = (category: KeywordCategory) => {
    if (createKeyword.isPending) return;
    const label = newLabel[category].trim();
    if (!label) return;
    createKeyword.mutate({ campaignId: campaign.id, data: { label, category } });
    setNewLabel((prev) => ({ ...prev, [category]: "" }));
  };

  const renderGroup = (category: KeywordCategory, title: string) => {
    const items = keywords.filter((k) => k.category === category);
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <div className="space-y-2">
          {items.length === 0 && <p className="text-xs text-muted-foreground">No keywords yet.</p>}
          {items.map((kw) => (
            <div key={kw.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
              <Switch
                checked={kw.enabled}
                onCheckedChange={(checked) => updateKeyword.mutate({ id: kw.id, data: { enabled: checked } })}
              />
              <span className={cn("text-sm flex-1 truncate", !kw.enabled && "text-muted-foreground line-through")}>{kw.label}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setEditingKeyword(kw);
                  setEditingLabel(kw.label);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteKeyword.mutate({ id: kw.id })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={`Add ${title.toLowerCase()}...`}
            value={newLabel[category]}
            onChange={(e) => setNewLabel((prev) => ({ ...prev, [category]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd(category);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAdd(category)}
            disabled={!newLabel[category].trim() || createKeyword.isPending}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keywords — {campaign.name}</DialogTitle>
          <DialogDescription>
            Customers pick from these to guide their AI-generated review. Toggle to enable or disable without deleting.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 py-2">
            {renderGroup(KeywordCategory.PRODUCT_SERVICE, "Product / Service")}
            {renderGroup(KeywordCategory.EXPERIENCE, "Experience")}
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Inline rename dialog for a keyword */}
      <Dialog open={!!editingKeyword} onOpenChange={(open) => !open && setEditingKeyword(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Keyword</DialogTitle>
          </DialogHeader>
          <Input value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingKeyword(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editingLabel.trim()}
              onClick={() => editingKeyword && updateKeyword.mutate({ id: editingKeyword.id, data: { label: editingLabel.trim() } })}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
