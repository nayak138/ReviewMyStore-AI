import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import {
  useListBusinesses,
  getListBusinessesQueryKey,
  useListCampaigns,
  getListCampaignsQueryKey,
  useGetCampaignQr,
  getGetCampaignQrQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  QrCode,
  Download,
  Copy,
  Check,
  FileImage,
  FileCode2,
  FileText,
  Megaphone,
} from "lucide-react";

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;

function downloadUrl(campaignId: string, format: "png" | "svg" | "pdf") {
  return `${API_BASE}/v1/campaigns/${campaignId}/qr/download/${format}`;
}

function QrCampaignCard({
  campaignId,
  campaignName,
  status,
}: {
  campaignId: string;
  campaignName: string;
  status: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: qr, isLoading } = useGetCampaignQr(campaignId, {
    query: { queryKey: getGetCampaignQrQueryKey(campaignId) },
  });

  const shortUrl = qr
    ? `${window.location.origin}${qr.redirectPath}`
    : null;

  const handleCopy = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Short link copied" });
    } catch {
      toast({ title: "Couldn't copy the link", variant: "destructive" });
    }
  };

  const formats = [
    { format: "png" as const, label: "PNG", icon: FileImage, hint: "High-res image" },
    { format: "svg" as const, label: "SVG", icon: FileCode2, hint: "Vector" },
    { format: "pdf" as const, label: "PDF", icon: FileText, hint: '4×6" print' },
  ];

  return (
    <Card className="shadow-sm border-border hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base truncate">{campaignName}</CardTitle>
          <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
            {status}
          </Badge>
        </div>
        {status !== "ACTIVE" && (
          <CardDescription className="text-xs">
            Scans of this code won't reach customers until the campaign is
            active.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="rounded-xl border border-border bg-white p-3">
            {isLoading ? (
              <Skeleton className="w-40 h-40" />
            ) : (
              <img
                src={downloadUrl(campaignId, "png")}
                alt={`QR code for ${campaignName}`}
                className="w-40 h-40"
                loading="lazy"
              />
            )}
          </div>
        </div>

        {shortUrl && (
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-left hover:bg-secondary transition-colors"
            title="Copy short link"
          >
            <code className="text-xs text-muted-foreground truncate">
              {shortUrl}
            </code>
            {copied ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        )}

        <div className="grid grid-cols-3 gap-2">
          {formats.map(({ format, label, icon: Icon, hint }) => (
            <Button
              key={format}
              asChild
              variant="outline"
              size="sm"
              className="flex-col h-auto py-2 gap-1"
            >
              <a href={downloadUrl(campaignId, format)} download>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {hint}
                </span>
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function QrCodes() {
  const { isLoaded, isSignedIn } = useAuth();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");

  const { data: businessData, isLoading: businessesLoading } =
    useListBusinesses(
      { includeArchived: false },
      {
        query: {
          enabled: !!isSignedIn,
          queryKey: getListBusinessesQueryKey({ includeArchived: false }),
        },
      },
    );

  const businesses = useMemo(
    () => businessData?.businesses ?? [],
    [businessData],
  );

  useEffect(() => {
    if (!selectedBusinessId && businesses.length > 0) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  const { data: campaignData, isLoading: campaignsLoading } = useListCampaigns(
    { businessId: selectedBusinessId, includeArchived: false },
    {
      query: {
        enabled: !!selectedBusinessId,
        queryKey: getListCampaignsQueryKey({
          businessId: selectedBusinessId,
          includeArchived: false,
        }),
      },
    },
  );

  const campaigns = campaignData?.campaigns ?? [];

  if (isLoaded && !isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  return (
    <AppLayout title="QR Codes">
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              QR Codes
            </h2>
            <p className="text-muted-foreground mt-1">
              Download print-ready QR codes for each campaign. Codes use a
              dynamic short link, so they keep working even if you change the
              campaign later.
            </p>
          </div>
          <Select
            value={selectedBusinessId}
            onValueChange={setSelectedBusinessId}
          >
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Select a business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  {business.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {businessesLoading || (selectedBusinessId && campaignsLoading) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="shadow-sm border-border">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-44 w-44 mx-auto" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-4">
                {businesses.length === 0 ? (
                  <QrCode className="w-6 h-6" />
                ) : (
                  <Megaphone className="w-6 h-6" />
                )}
              </div>
              <h3 className="font-semibold text-foreground">
                {businesses.length === 0
                  ? "Add a business first"
                  : "No campaigns yet"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {businesses.length === 0
                  ? "QR codes are generated per campaign — create a business and a campaign to get started."
                  : "Create a campaign for this business and its QR code will appear here automatically."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <QrCampaignCard
                key={campaign.id}
                campaignId={campaign.id}
                campaignName={campaign.name}
                status={campaign.status}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
