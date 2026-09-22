import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AtSign,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Facebook,
  Instagram,
  Link2,
  Loader2,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Unplug,
} from "lucide-react";
import {
  SocialMediaPlatform,
  type SocialMediaAccount,
  type SocialMediaComment,
  type SocialMediaPost,
  getGetSocialMediaDashboardQueryKey,
  getListBusinessesQueryKey,
  getListSocialMediaCommentsQueryKey,
  getListSocialMediaPostsQueryKey,
  useAttachSocialMediaAccount,
  useCreateSocialMediaPost,
  useDetachSocialMediaAccount,
  useGetSocialMediaDashboard,
  useImportSocialMediaComments,
  useListBusinesses,
  useListSocialMediaComments,
  useListSocialMediaPosts,
  useReplyToSocialMediaComment,
  useRequestSocialMediaMediaUploadUrl,
  useStartSocialMediaConnection,
  useFinalizeUpload,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { BusinessTabs } from "@/components/business/business-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PLATFORM_META: Record<SocialMediaPlatform, { label: string; shortLabel: string; icon: typeof Facebook; tint: string }> = {
  [SocialMediaPlatform.FACEBOOK]: { label: "Facebook", shortLabel: "Facebook", icon: Facebook, tint: "text-[#385898] bg-[#385898]/10" },
  [SocialMediaPlatform.INSTAGRAM]: { label: "Instagram", shortLabel: "Instagram", icon: Instagram, tint: "text-[#b42d74] bg-[#b42d74]/10" },
  [SocialMediaPlatform.THREADS]: { label: "Threads", shortLabel: "Threads", icon: AtSign, tint: "text-foreground bg-secondary" },
};

const PLATFORMS = [SocialMediaPlatform.FACEBOOK, SocialMediaPlatform.INSTAGRAM, SocialMediaPlatform.THREADS] as const;
type SupportedMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "video/mp4" | "video/quicktime" | "video/webm";
const ACCEPTED_MEDIA_TYPES = new Set<SupportedMediaType>(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm"]);
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

type UploadedMedia = {
  objectPath: string;
  name: string;
  type: string;
  previewUrl: string;
};

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function minimumScheduleTime() {
  const date = new Date(Date.now() + 60_000);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function PlatformMark({ platform, className }: { platform: SocialMediaPlatform; className?: string }) {
  const Icon = PLATFORM_META[platform].icon;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden="true" />;
}

function PlatformBadge({ platform }: { platform: SocialMediaPlatform }) {
  const meta = PLATFORM_META[platform];
  return (
    <Badge variant="outline" className="gap-1.5 border-border bg-background font-medium">
      <PlatformMark platform={platform} className={meta.tint.split(" ")[0]} />
      {meta.shortLabel}
    </Badge>
  );
}

function isPublishedPost(post: Pick<SocialMediaPost, "status" | "publishedAt">) {
  const status = post.status.toUpperCase();
  return Boolean(post.publishedAt) || status === "POSTED" || status === "PUBLISHED";
}

function AccountRow({
  account,
  onDetach,
  isDetaching,
}: {
  account: SocialMediaAccount;
  onDetach: (account: SocialMediaAccount) => void;
  isDetaching: boolean;
}) {
  const meta = PLATFORM_META[account.platform];
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-3" data-testid={`row-connected-account-${account.id}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.tint)}>
          <PlatformMark platform={account.platform} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" data-testid={`text-account-name-${account.id}`}>{account.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{account.username ? `@${account.username}` : meta.label}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDetach(account)}
        disabled={isDetaching}
        data-testid={`button-detach-account-${account.id}`}
      >
        {isDetaching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Unplug className="mr-1.5 h-3.5 w-3.5" />}
        Detach
      </Button>
    </div>
  );
}

function PostCard({ post, onImportComments, importing }: { post: SocialMediaPost; onImportComments: (post: SocialMediaPost) => void; importing: boolean }) {
  const status = post.status.toUpperCase();
  const canImportComments = isPublishedPost(post);
  const statusClass =
    status.includes("PUBLISH") ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" :
      status.includes("SCHEDUL") ? "border-sky-500/20 bg-sky-500/10 text-sky-700" :
        status.includes("FAIL") || status.includes("ERROR") ? "border-destructive/20 bg-destructive/10 text-destructive" :
          "border-border bg-secondary text-muted-foreground";
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm" data-testid={`card-post-${post.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("font-medium", statusClass)} data-testid={`status-post-${post.id}`}>{status.replaceAll("_", " ")}</Badge>
            {post.platforms.map((platform) => <PlatformBadge key={platform} platform={platform} />)}
          </div>
          {post.title && <h3 className="font-semibold leading-snug" data-testid={`text-post-title-${post.id}`}>{post.title}</h3>}
        </div>
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85" data-testid={`text-post-caption-${post.id}`}>
        {post.caption || "No caption"}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{post.publishedAt ? `Published ${formatDate(post.publishedAt, true)}` : post.scheduledAt ? `Scheduled ${formatDate(post.scheduledAt, true)}` : "Created recently"}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onImportComments(post)}
          disabled={importing || !canImportComments}
          title={canImportComments ? undefined : "Comments can be imported after this post is live."}
          data-testid={`button-import-comments-${post.id}`}
        >
          {importing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="mr-1.5 h-3.5 w-3.5" />}
          Import comments
        </Button>
      </div>
    </article>
  );
}

export default function SocialMedia() {
  const { isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const routeParams = new URLSearchParams(window.location.search);
  const workspaceBusinessId = routeParams.get("businessId");
  const routeBusinessName = routeParams.get("businessName");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(workspaceBusinessId);
  const [callbackReturned, setCallbackReturned] = useState(false);
  const [callbackFailed, setCallbackFailed] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialMediaPlatform[]>([]);
  const [accountPickerPlatform, setAccountPickerPlatform] = useState<SocialMediaPlatform | "">("");
  const [selectedAvailableAccounts, setSelectedAvailableAccounts] = useState<Partial<Record<SocialMediaPlatform, string>>>({});
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [selectedCommentPlatform, setSelectedCommentPlatform] = useState<SocialMediaPlatform | "">("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [accountToDetach, setAccountToDetach] = useState<SocialMediaAccount | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<SocialMediaPlatform | null>(null);
  const [importingPostId, setImportingPostId] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const businessesQuery = useListBusinesses(
    { includeArchived: false },
    { query: { enabled: !!isSignedIn, queryKey: getListBusinessesQueryKey({ includeArchived: false }) } },
  );
  const businesses = useMemo(() => businessesQuery.data?.businesses ?? [], [businessesQuery.data]);
  const workspaceBusiness = businesses.find((business) => business.id === workspaceBusinessId) ??
    (workspaceBusinessId && routeBusinessName ? { id: workspaceBusinessId, name: routeBusinessName, address: null } : undefined) ??
    businesses[0];

  useEffect(() => {
    if (workspaceBusinessId && businesses.some((business) => business.id === workspaceBusinessId)) {
      setSelectedBusinessId(workspaceBusinessId);
    } else if (!selectedBusinessId && businesses[0]) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId, workspaceBusinessId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("socialConnect") !== "1") return;
    params.delete("socialConnect");
    const providerFailed = Boolean(
      params.get("error") ||
      params.get("error_description") ||
      params.get("error_reason"),
    );
    params.delete("error");
    params.delete("error_description");
    params.delete("error_reason");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    setCallbackFailed(providerFailed);
    setCallbackReturned(!providerFailed);
  }, []);

  const dashboardParams = { businessId: selectedBusinessId ?? "" };
  const dashboardKey = getGetSocialMediaDashboardQueryKey(dashboardParams);
  const dashboardQuery = useGetSocialMediaDashboard(dashboardParams, {
    query: { enabled: !!isSignedIn && !!selectedBusinessId, queryKey: dashboardKey },
  });
  const dashboard = dashboardQuery.data;
  const postsParams = { businessId: selectedBusinessId ?? "" };
  const postsKey = getListSocialMediaPostsQueryKey(postsParams);
  const postsQuery = useListSocialMediaPosts(postsParams, {
    query: { enabled: !!isSignedIn && !!selectedBusinessId, queryKey: postsKey },
  });
  const posts = postsQuery.data?.posts ?? [];
  const shouldBoundPostQueue = posts.length > 3;
  const publishedPosts = useMemo(() => posts.filter(isPublishedPost), [posts]);
  const selectedCommentPost = publishedPosts.find((post) => post.id === selectedPostId);
  const commentsParams = { businessId: selectedBusinessId ?? "", postId: selectedPostId || undefined };
  const commentsKey = getListSocialMediaCommentsQueryKey(commentsParams);
  const commentsQuery = useListSocialMediaComments(commentsParams, {
    query: { enabled: !!isSignedIn && !!selectedBusinessId && !!selectedPostId, queryKey: commentsKey },
  });
  const comments = commentsQuery.data?.comments ?? [];
  const connectedPlatforms = useMemo(() => new Set((dashboard?.accounts ?? []).map((account) => account.platform)), [dashboard?.accounts]);
  const authorizedPlatforms = useMemo(
    () => new Set((dashboard?.availableAccounts ?? []).map((account) => account.platform)),
    [dashboard?.availableAccounts],
  );
  const availableAccountsByPlatform = useMemo(
    () =>
      PLATFORMS.reduce(
        (groups, platform) => {
          groups[platform] = (dashboard?.availableAccounts ?? []).filter(
            (account) => account.platform === platform && !account.connected,
          );
          return groups;
        },
        {} as Record<SocialMediaPlatform, NonNullable<typeof dashboard>["availableAccounts"]>,
      ),
    [dashboard?.availableAccounts],
  );

  useEffect(() => {
    if (!selectedPostId && publishedPosts[0]) setSelectedPostId(publishedPosts[0].id);
    if (selectedPostId && !publishedPosts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(publishedPosts[0]?.id ?? "");
    }
  }, [publishedPosts, selectedPostId]);

  useEffect(() => {
    const platforms = selectedCommentPost?.platforms ?? [];
    if (
      !selectedCommentPlatform ||
      !platforms.includes(selectedCommentPlatform)
    ) {
      setSelectedCommentPlatform(platforms[0] ?? "");
    }
  }, [selectedCommentPlatform, selectedCommentPost]);

  useEffect(() => {
    setSelectedPlatforms((current) => current.filter((platform) => connectedPlatforms.has(platform)));
  }, [connectedPlatforms]);

  useEffect(() => {
    const firstAvailablePlatform = PLATFORMS.find((platform) => availableAccountsByPlatform[platform].length > 0) ?? "";
    if (!accountPickerPlatform || availableAccountsByPlatform[accountPickerPlatform].length === 0) {
      setAccountPickerPlatform(firstAvailablePlatform);
    }
  }, [accountPickerPlatform, availableAccountsByPlatform]);

  useEffect(() => {
    if (callbackFailed && selectedBusinessId) {
      queryClient.invalidateQueries({ queryKey: getGetSocialMediaDashboardQueryKey({ businessId: selectedBusinessId }) });
      setCallbackFailed(false);
      toast({
        title: "Social authorization wasn't completed",
        description: "No account was connected. You can try again when you're ready.",
        variant: "destructive",
      });
    } else if (callbackReturned && selectedBusinessId) {
      queryClient.invalidateQueries({ queryKey: getGetSocialMediaDashboardQueryKey({ businessId: selectedBusinessId }) });
      setCallbackReturned(false);
      toast({ title: "Social account authorized", description: "Choose the Page or account you want this business to publish to." });
    }
  }, [callbackFailed, callbackReturned, selectedBusinessId, queryClient, toast]);

  const invalidateSocial = () => {
    if (!selectedBusinessId) return;
    queryClient.invalidateQueries({ queryKey: getGetSocialMediaDashboardQueryKey({ businessId: selectedBusinessId }) });
    queryClient.invalidateQueries({ queryKey: getListSocialMediaPostsQueryKey({ businessId: selectedBusinessId }) });
  };

  const startConnection = useStartSocialMediaConnection({
    mutation: {
      onSuccess: (result) => {
        setConnectingPlatform(null);
        const opened = window.open(result.authUrl, "_blank");
        if (opened) {
          try { opened.opener = null; } catch { /* cross-origin tab */ }
          toast({ title: `Connect ${PLATFORM_META[result.platform].label} in the new tab`, description: "Finish authorization there, then return here to review the account." });
        } else {
          window.location.href = result.authUrl;
        }
      },
      onError: (error) => {
        setConnectingPlatform(null);
        toast({ title: "Unable to start connection", description: errorMessage(error, "Please try again."), variant: "destructive" });
      },
    },
  });
  const attachAccount = useAttachSocialMediaAccount({
    mutation: {
      onSuccess: () => { invalidateSocial(); toast({ title: "Publishing account selected", description: "This business will publish to the account you chose." }); },
      onError: (error) => toast({ title: "Unable to attach account", description: errorMessage(error, "Please try again."), variant: "destructive" }),
    },
  });
  const detachAccount = useDetachSocialMediaAccount({
    mutation: {
      onSuccess: () => { setAccountToDetach(null); invalidateSocial(); toast({ title: "Account detached" }); },
      onError: (error) => toast({ title: "Unable to detach account", description: errorMessage(error, "Please try again."), variant: "destructive" }),
    },
  });
  const finalizeUpload = useFinalizeUpload();
  const requestMediaUploadUrl = useRequestSocialMediaMediaUploadUrl();
  const createPost = useCreateSocialMediaPost({
    mutation: {
      onSuccess: () => {
        invalidateSocial();
        setCaption("");
        setTitle("");
        setMedia([]);
        setScheduleEnabled(false);
        setScheduledAt("");
        toast({ title: scheduleEnabled ? "Post scheduled" : "Post published", description: scheduleEnabled ? "It will publish at the selected time." : "Your post is being sent to the selected channels." });
      },
      onError: (error) => toast({ title: "Unable to publish post", description: errorMessage(error, "Check the post details and try again."), variant: "destructive" }),
    },
  });
  const importComments = useImportSocialMediaComments({
    mutation: {
      onSuccess: (_result, variables) => {
        const postId = variables.data.postId ?? "";
        setImportingPostId(null);
        if (postId) {
          setSelectedPostId(postId);
          queryClient.invalidateQueries({ queryKey: getListSocialMediaCommentsQueryKey({ businessId: selectedBusinessId ?? "", postId }) });
        }
        toast({ title: "Comment import started", description: "New public conversations will appear shortly." });
      },
      onError: (error) => { setImportingPostId(null); toast({ title: "Unable to import comments", description: errorMessage(error, "Please try again."), variant: "destructive" }); },
    },
  });
  const replyComment = useReplyToSocialMediaComment({
    mutation: {
      onSuccess: (_result, variables) => {
        setReplyDrafts((current) => ({ ...current, [variables.id]: "" }));
        if (selectedBusinessId) queryClient.invalidateQueries({ queryKey: getListSocialMediaCommentsQueryKey({ businessId: selectedBusinessId, postId: selectedPostId || undefined }) });
        toast({ title: "Reply published" });
      },
      onError: (error) => toast({ title: "Unable to publish reply", description: errorMessage(error, "Please try again."), variant: "destructive" }),
    },
  });

  const handleConnect = (platform: SocialMediaPlatform) => {
    if (!selectedBusinessId) return;
    setConnectingPlatform(platform);
    startConnection.mutate({ data: { businessId: selectedBusinessId, platform } });
  };
  const handlePublish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBusinessId || !caption.trim() || selectedPlatforms.length === 0) return;
    createPost.mutate({
      data: {
        businessId: selectedBusinessId,
        title: title.trim() || undefined,
        caption: caption.trim(),
        platforms: selectedPlatforms,
        media: media.map((item) => item.objectPath),
        scheduledAt: scheduleEnabled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      },
    });
  };
  const handleMediaSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (media.length + files.length > 10) {
      toast({ title: "Too many media files", description: "Attach up to 10 images or videos.", variant: "destructive" });
      return;
    }
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      if (!ACCEPTED_MEDIA_TYPES.has(file.type as SupportedMediaType) || file.size > (isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) {
        toast({ title: "Unsupported media file", description: "Use JPG, PNG, WEBP, GIF, MP4, MOV, or WEBM. Images can be up to 25 MB and videos up to 100 MB.", variant: "destructive" });
        return;
      }
    }
    try {
      setIsUploadingMedia(true);
      for (const file of files) {
        if (!selectedBusinessId) throw new Error("Choose a business before adding media.");
        const contentType = file.type as SupportedMediaType;
        const upload = await requestMediaUploadUrl.mutateAsync({
          data: {
            businessId: selectedBusinessId,
            name: file.name,
            size: file.size,
            contentType,
          },
        });
        const response = await fetch(upload.uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!response.ok) throw new Error("The file could not be uploaded.");
        const finalized = await finalizeUpload.mutateAsync({ data: { objectPath: upload.objectPath, visibility: "public" } });
        setMedia((current) => [...current, {
          objectPath: finalized.objectPath,
          name: file.name,
          type: file.type,
          previewUrl: `/api/storage/public-assets/${finalized.objectPath.replace(/^\/objects\//, "")}`,
        }]);
      }
      toast({ title: files.length === 1 ? "Media attached" : "Media attached", description: "Your media is ready to publish or schedule." });
    } catch (error) {
      toast({ title: "Media upload failed", description: errorMessage(error, "Try uploading the file again."), variant: "destructive" });
    } finally {
      setIsUploadingMedia(false);
    }
  };
  const handleImportComments = (post: SocialMediaPost) => {
    if (!selectedBusinessId) return;
    if (!isPublishedPost(post)) {
      toast({
        title: "Post isn't live yet",
        description: "Comments can be imported after the post has published.",
        variant: "destructive",
      });
      return;
    }
    const platform = selectedCommentPlatform && post.platforms.includes(selectedCommentPlatform)
      ? selectedCommentPlatform
      : post.platforms[0];
    if (!platform) {
      toast({
        title: "Choose a channel first",
        description: "This post does not include a connected channel to import comments from.",
        variant: "destructive",
      });
      return;
    }
    setSelectedPostId(post.id);
    setSelectedCommentPlatform(platform);
    setImportingPostId(post.id);
    importComments.mutate({
      data: { businessId: selectedBusinessId, postId: post.id, platform },
    });
  };
  const togglePlatform = (platform: SocialMediaPlatform) => {
    setSelectedPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]);
  };

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  return (
    <AppLayout title="Social Media" businessName={workspaceBusiness?.name}>
      <div
        className="mx-auto flex max-w-6xl flex-col space-y-6 p-4 md:p-8"
        data-testid="social-workspace"
      >
        {workspaceBusiness && (
          <BusinessTabs businessId={workspaceBusiness.id} businessName={workspaceBusiness.name} active="social-media" />
        )}

        {!businessesQuery.isLoading && businesses.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground"><AtSign className="h-6 w-6" /></div>
              <h2 className="text-xl font-semibold">Add a business before connecting social accounts</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Social accounts, posts, and replies stay scoped to the business you are acting for.</p>
            </CardContent>
          </Card>
        )}
        {businessesQuery.isError && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4" role="alert" data-testid="state-businesses-error">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold">Businesses could not load</p>
                <p className="mt-1 text-xs text-muted-foreground">{errorMessage(businessesQuery.error, "Try again before opening the social workspace.")}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => businessesQuery.refetch()} data-testid="button-retry-businesses">Try again</Button>
              </div>
            </div>
          </div>
        )}

        {selectedBusinessId && (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="overflow-hidden border-primary/15 bg-primary/[0.035]">
                <CardHeader className="border-b border-border/70 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg"><Link2 className="h-4 w-4 text-primary" /> Connected channels</CardTitle>
                      <CardDescription className="mt-1">Only attached channels can receive posts for this business.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => dashboardQuery.refetch()} disabled={dashboardQuery.isFetching} aria-label="Refresh connected channels" data-testid="button-refresh-social">
                      <RefreshCw className={cn("h-4 w-4", dashboardQuery.isFetching && "animate-spin")} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {dashboardQuery.isLoading ? [0, 1].map((item) => <Skeleton key={item} className="h-16 w-full rounded-xl" />) :
                    dashboardQuery.isError ? (
                      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4" role="alert" data-testid="state-dashboard-error">
                        <div className="flex gap-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /><div><p className="text-sm font-semibold">Channels could not load</p><p className="mt-1 text-xs text-muted-foreground">{errorMessage(dashboardQuery.error, "Try refreshing this workspace.")}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => dashboardQuery.refetch()} data-testid="button-retry-dashboard">Try again</Button></div></div>
                      </div>
                    ) : dashboard?.accounts.length ? dashboard.accounts.map((account) => <AccountRow key={account.id} account={account} onDetach={setAccountToDetach} isDetaching={detachAccount.isPending} />) : (
                      <div className="rounded-xl border border-dashed border-border px-4 py-7 text-center" data-testid="state-no-connected-accounts">
                        <p className="text-sm font-semibold">No channels attached yet</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Start with a channel on the right, then choose the provider account for this business.</p>
                      </div>
                    )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Add a channel</CardTitle>
                   <CardDescription>Authorize a channel, then choose the exact account for this business.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                   <RadioGroup
                     value={accountPickerPlatform}
                     onValueChange={(value) => setAccountPickerPlatform(value as SocialMediaPlatform)}
                     className="space-y-2"
                     aria-label="Choose a social platform"
                   >
                     {PLATFORMS.map((platform) => {
                       const meta = PLATFORM_META[platform];
                       const connected = connectedPlatforms.has(platform);
                       const availableAccounts = availableAccountsByPlatform[platform];
                       const authorized = authorizedPlatforms.has(platform);
                       const selectedAccountId = selectedAvailableAccounts[platform] ?? "";
                       return (
                         <div key={platform} className="rounded-xl border border-border px-3 py-2.5" data-testid={`row-connect-${platform.toLowerCase()}`}>
                           <div className="flex items-center gap-3">
                             <RadioGroupItem
                               value={platform}
                               id={`social-platform-${platform.toLowerCase()}`}
                               disabled={connected || availableAccounts.length === 0}
                               data-testid={`radio-platform-${platform.toLowerCase()}`}
                             />
                             <label htmlFor={`social-platform-${platform.toLowerCase()}`} className={cn("flex min-w-0 flex-1 items-center gap-3", !connected && availableAccounts.length === 0 && "cursor-default opacity-60")}>
                               <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.tint)}><PlatformMark platform={platform} /></div>
                               <span className="text-sm font-medium">{meta.label}</span>
                             </label>
                             {connected ? (
                               <Badge variant="outline" className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Attached</Badge>
                             ) : availableAccounts.length === 0 ? (
                               <Button variant="outline" size="sm" onClick={() => handleConnect(platform)} disabled={!!connectingPlatform} data-testid={`button-connect-${platform.toLowerCase()}`}>
                                 {connectingPlatform === platform ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />} {authorized ? "Refresh access" : "Connect"}
                               </Button>
                             ) : (
                               <div className="flex items-center gap-2">
                                 <Select
                                   value={selectedAccountId}
                                   onValueChange={(externalAccountId) => {
                                     setSelectedAvailableAccounts((current) => ({ ...current, [platform]: externalAccountId }));
                                     if (selectedBusinessId) {
                                       attachAccount.mutate({ data: { businessId: selectedBusinessId, externalAccountId } });
                                     }
                                   }}
                                   disabled={attachAccount.isPending}
                                 >
                                   <SelectTrigger className="w-[min(13rem,48vw)]" aria-label={`Choose ${meta.label} account`} data-testid={`select-account-${platform.toLowerCase()}`}>
                                     <SelectValue placeholder={`Choose ${meta.label} account`} />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {availableAccounts.map((account) => (
                                       <SelectItem key={account.externalAccountId} value={account.externalAccountId} data-testid={`option-account-${account.externalAccountId}`}>
                                         {account.displayName}{account.username ? ` (@${account.username})` : ""}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                                 <Button
                                   type="button"
                                   variant="ghost"
                                   size="sm"
                                   className="shrink-0 px-2 text-xs text-muted-foreground"
                                   onClick={() => handleConnect(platform)}
                                   disabled={!!connectingPlatform}
                                   data-testid={`button-refresh-access-${platform.toLowerCase()}`}
                                 >
                                   {connectingPlatform === platform ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
                                   Refresh access
                                 </Button>
                               </div>
                             )}
                           </div>
                         </div>
                       );
                     })}
                   </RadioGroup>
                   <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
                     If an account is missing, click Refresh access and authorize the correct Instagram, Facebook, or Threads account. Then use the radio row and dropdown to select the destination for this business.
                   </p>
                </CardContent>
              </Card>
            </section>

            <section className="grid items-start gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-primary/20 shadow-md shadow-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4"><div><CardTitle className="flex items-center gap-2 text-xl"><Send className="h-4 w-4 text-primary" /> Compose a post</CardTitle><CardDescription className="mt-1">Write once, attach media when needed, and choose where it goes.</CardDescription></div><Badge variant="secondary">Media-ready</Badge></div>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handlePublish} data-testid="form-social-post">
                    <div className="space-y-2"><Label htmlFor="post-title">Internal title <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="post-title" maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Spring hours update" data-testid="input-post-title" /></div>
                    <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="post-caption">Caption</Label><span className="text-xs text-muted-foreground">{caption.length}/5000</span></div><Textarea id="post-caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={5000} placeholder="Share something your customers will find useful..." className="min-h-36 resize-y leading-relaxed" required data-testid="textarea-post-caption" /></div>
                    <div className="space-y-2"><div className="flex items-center justify-between gap-3"><Label>Media <span className="font-normal text-muted-foreground">(optional, required for Instagram)</span></Label><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" multiple className="sr-only" onChange={handleMediaSelection} data-testid="input-post-media" /><Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingMedia || finalizeUpload.isPending} data-testid="button-add-post-media">{isUploadingMedia || finalizeUpload.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Paperclip className="mr-1.5 h-3.5 w-3.5" />}{isUploadingMedia ? "Uploading media..." : "Add media"}</Button></div><p className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF, MP4, MOV, or WEBM. Images up to 25 MB; videos up to 100 MB.</p>{media.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{media.map((item) => <div key={item.objectPath} className="group relative overflow-hidden rounded-xl border border-border bg-secondary/30" data-testid={`media-preview-${item.objectPath}`}><div className="aspect-square bg-muted">{item.type.startsWith("video/") ? <video src={item.previewUrl} className="h-full w-full object-cover" controls preload="metadata" /> : <img src={item.previewUrl} alt={item.name} className="h-full w-full object-cover" />}</div><div className="flex items-center justify-between gap-1 px-2 py-1.5"><span className="truncate text-[11px] text-muted-foreground">{item.name}</span><Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setMedia((current) => current.filter((mediaItem) => mediaItem.objectPath !== item.objectPath))} aria-label={`Remove ${item.name}`}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>)}</div>}</div>
                    <div className="space-y-2"><Label>Publish to</Label><div className="grid gap-2 sm:grid-cols-3">{PLATFORMS.map((platform) => { const meta = PLATFORM_META[platform]; const selected = selectedPlatforms.includes(platform); const unavailable = !connectedPlatforms.has(platform) || (platform === SocialMediaPlatform.INSTAGRAM && media.length === 0); return <button type="button" key={platform} onClick={() => !unavailable && togglePlatform(platform)} disabled={unavailable} title={platform === SocialMediaPlatform.INSTAGRAM && media.length === 0 ? "Add an image or video to publish to Instagram." : undefined} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors", selected ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-secondary", unavailable && "cursor-not-allowed opacity-45")} aria-pressed={selected} data-testid={`button-select-platform-${platform.toLowerCase()}`}><span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", meta.tint)}><PlatformMark platform={platform} /></span><span className="flex-1"><span className="block">{meta.label}</span>{platform === SocialMediaPlatform.INSTAGRAM && <span className="block text-[10px] text-muted-foreground">Media required</span>}</span>{selected && <Check className="h-4 w-4" />}</button>; })}</div><p className="text-xs text-muted-foreground">{media.length ? "Instagram is available because this post includes media." : "Add media to unlock Instagram publishing."}</p></div>
                    <div className="rounded-xl border border-border bg-secondary/50 p-3.5"><button type="button" className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setScheduleEnabled((value) => !value)} aria-pressed={scheduleEnabled} data-testid="button-toggle-schedule"><span className="flex items-center gap-2 text-sm font-medium"><CalendarClock className="h-4 w-4 text-primary" /> Schedule for later</span><span className={cn("relative h-5 w-9 rounded-full transition-colors", scheduleEnabled ? "bg-primary" : "bg-muted")}><span className={cn("absolute top-1 h-3 w-3 rounded-full bg-card transition-transform", scheduleEnabled ? "translate-x-5" : "translate-x-1")} /></span></button>{scheduleEnabled && <div className="mt-3 space-y-1.5"><Label htmlFor="scheduled-at" className="text-xs">Date and time</Label><Input id="scheduled-at" type="datetime-local" min={minimumScheduleTime()} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required data-testid="input-scheduled-at" /></div>}</div>
                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3 text-xs leading-relaxed text-sky-900 dark:text-sky-100"><p className="font-semibold">About media</p><p className="mt-1 text-sky-900/75 dark:text-sky-100/75">Instagram posts need at least one image or video. Attached media is prepared with the social provider when you publish or schedule.</p></div>
                    <Button type="submit" className="w-full shadow-sm" disabled={createPost.isPending || isUploadingMedia || finalizeUpload.isPending || !caption.trim() || selectedPlatforms.length === 0 || (scheduleEnabled && !scheduledAt)} data-testid="button-publish-post">{createPost.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : scheduleEnabled ? <CalendarClock className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}{createPost.isPending ? "Sending..." : scheduleEnabled ? "Schedule post" : "Publish now"}</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div><CardTitle className="text-xl">Recent queue</CardTitle><CardDescription className="mt-1">See what is moving through this business.</CardDescription></div>
                  <Button variant="ghost" size="icon" onClick={() => postsQuery.refetch()} disabled={postsQuery.isFetching} aria-label="Refresh post queue" data-testid="button-refresh-posts"><RefreshCw className={cn("h-4 w-4", postsQuery.isFetching && "animate-spin")} /></Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {postsQuery.isLoading ? <div data-testid="state-posts-loading" className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="space-y-3 rounded-2xl border border-border p-4"><Skeleton className="h-5 w-32" /><Skeleton className="h-16 w-full" /><Skeleton className="h-8 w-28" /></div>)}</div> :
                    postsQuery.isError ? <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm" role="alert" data-testid="state-posts-error"><p className="font-semibold">Posts could not load</p><p className="mt-1 text-xs text-muted-foreground">{errorMessage(postsQuery.error, "Try again in a moment.")}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => postsQuery.refetch()} data-testid="button-retry-posts">Try again</Button></div> :
                       posts.length ? (
                         <div
                           className={cn(
                             "space-y-3",
                             shouldBoundPostQueue && "max-h-[min(36rem,calc(100dvh-12rem))] overflow-y-auto overscroll-contain pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:max-h-[min(42rem,calc(100dvh-14rem))]",
                           )}
                           data-testid="post-queue-scroll"
                           tabIndex={shouldBoundPostQueue ? 0 : undefined}
                           role={shouldBoundPostQueue ? "region" : undefined}
                           aria-label={shouldBoundPostQueue ? "Scrollable recent post queue" : undefined}
                         >
                           {posts.slice(0, 8).map((post) => <PostCard key={post.id} post={post} onImportComments={handleImportComments} importing={importingPostId === post.id} />)}
                         </div>
                       ) :
                         <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center" data-testid="state-no-posts"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Send className="h-5 w-5" /></div><p className="text-sm font-semibold">Your queue is clear</p><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">A thoughtful, useful post can start the conversation. Compose one on the left.</p></div>}
                </CardContent>
              </Card>
            </section>

            <section
              className="grid items-stretch gap-6 lg:grid-cols-[0.8fr_1.2fr]"
              data-testid="social-conversations"
            >
              <Card className="h-full">
                <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><MessageSquare className="h-4 w-4 text-primary" /> Public conversations</CardTitle><CardDescription className="mt-1">Import comments from a post, then reply without leaving the workspace.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="comment-post">Live post to review</Label><Select value={selectedPostId} onValueChange={setSelectedPostId}><SelectTrigger id="comment-post" data-testid="select-comment-post"><SelectValue placeholder={publishedPosts.length ? "Choose a live post" : "Publish a post first"} /></SelectTrigger><SelectContent>{publishedPosts.map((post) => <SelectItem key={post.id} value={post.id} data-testid={`option-comment-post-${post.id}`}>{post.title || (post.caption || "Untitled post").slice(0, 42)}</SelectItem>)}</SelectContent></Select></div>
                  {selectedCommentPost && selectedCommentPost.platforms.length > 1 && <div className="space-y-2"><Label htmlFor="comment-platform">Channel to review</Label><Select value={selectedCommentPlatform} onValueChange={(value) => setSelectedCommentPlatform(value as SocialMediaPlatform)}><SelectTrigger id="comment-platform" data-testid="select-comment-platform"><SelectValue placeholder="Choose a channel" /></SelectTrigger><SelectContent>{selectedCommentPost.platforms.map((platform) => <SelectItem key={platform} value={platform} data-testid={`option-comment-platform-${platform.toLowerCase()}`}>{PLATFORM_META[platform].label}</SelectItem>)}</SelectContent></Select></div>}
                  {selectedPostId && <Button variant="outline" className="w-full" onClick={() => { if (selectedCommentPost) handleImportComments(selectedCommentPost); }} disabled={!!importingPostId || !selectedCommentPlatform} data-testid="button-import-selected-comments"><MessageCircle className="mr-2 h-4 w-4" />Import latest comments</Button>}
                  {!selectedPostId && <div className="rounded-xl bg-secondary/60 p-4 text-center text-xs leading-relaxed text-muted-foreground">{posts.length ? "Scheduled posts will be available here once they are live." : "Publish a post first to bring its public comments into this desk."}</div>}
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle className="text-xl">Reply desk</CardTitle><CardDescription className="mt-1">{selectedPostId ? "Keep replies direct, useful, and on-brand." : "Select a post to load its conversation."}</CardDescription></div>{commentsQuery.isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}</CardHeader>
                <CardContent className="space-y-3">
                  <div
                    className={cn(
                      comments.length > 3 && "max-h-[min(36rem,calc(100dvh-16rem))] overflow-y-auto overscroll-contain pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                    data-testid="comment-desk-scroll"
                    tabIndex={comments.length > 3 ? 0 : undefined}
                    role={comments.length > 3 ? "region" : undefined}
                    aria-label={comments.length > 3 ? "Scrollable reply desk" : undefined}
                  >
                    {commentsQuery.isLoading ? <div data-testid="state-comments-loading" className="space-y-3">{[0, 1].map((item) => <div key={item} className="space-y-3 rounded-xl border border-border p-4"><Skeleton className="h-4 w-36" /><Skeleton className="h-12 w-full" /><Skeleton className="h-9 w-full" /></div>)}</div> :
                      commentsQuery.isError ? <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm" role="alert" data-testid="state-comments-error"><p className="font-semibold">Comments could not load</p><p className="mt-1 text-xs text-muted-foreground">{errorMessage(commentsQuery.error, "Try importing the comments again.")}</p></div> :
                        comments.length ? <div className="space-y-3">{comments.map((comment) => <CommentRow key={comment.id} comment={comment} draft={replyDrafts[comment.id] ?? ""} onDraftChange={(value) => setReplyDrafts((current) => ({ ...current, [comment.id]: value }))} onReply={() => selectedBusinessId && replyComment.mutate({ id: comment.id, data: { businessId: selectedBusinessId, text: (replyDrafts[comment.id] ?? "").trim() } })} isReplying={replyComment.isPending} />)}</div> :
                          <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center" data-testid="state-no-comments"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><MessageSquare className="h-5 w-5" /></div><p className="text-sm font-semibold">No imported comments yet</p><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Import a post's latest public comments to bring the conversation into this desk.</p></div>}
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>

      <Dialog open={!!accountToDetach} onOpenChange={(open) => !open && setAccountToDetach(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detach this account?</DialogTitle><DialogDescription>{accountToDetach ? `${accountToDetach.displayName} will no longer receive posts for ${workspaceBusiness?.name ?? "this business"}. Your post history will remain.` : ""}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setAccountToDetach(null)} data-testid="button-cancel-detach">Keep connected</Button><Button variant="destructive" onClick={() => accountToDetach && detachAccount.mutate({ id: accountToDetach.id })} disabled={detachAccount.isPending} data-testid="button-confirm-detach">{detachAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Detach account</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function CommentRow({
  comment,
  draft,
  onDraftChange,
  onReply,
  isReplying,
}: {
  comment: SocialMediaComment;
  draft: string;
  onDraftChange: (value: string) => void;
  onReply: () => void;
  isReplying: boolean;
}) {
  return (
    <article className="rounded-2xl border border-border bg-background p-4" data-testid={`card-comment-${comment.id}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{comment.authorName.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-sm font-semibold" data-testid={`text-comment-author-${comment.id}`}>{comment.authorName}</p>{comment.createdAt && <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt, true)}</span>}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85" data-testid={`text-comment-${comment.id}`}>{comment.text}</p></div>
      </div>
      {comment.canReply ? <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"><Textarea value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder="Write a public reply..." maxLength={2000} className="min-h-20 resize-y text-sm" aria-label={`Reply to ${comment.authorName}`} data-testid={`textarea-reply-${comment.id}`} /><Button className="shrink-0 sm:mb-0" onClick={onReply} disabled={isReplying || !draft.trim()} data-testid={`button-reply-comment-${comment.id}`}>{isReplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Reply</Button></div> : <p className="mt-3 text-xs text-muted-foreground">Replies are unavailable for this comment.</p>}
    </article>
  );
}