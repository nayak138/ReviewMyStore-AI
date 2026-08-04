import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBusinesses,
  getListBusinessesQueryKey,
  useListCampaigns,
  getListCampaignsQueryKey,
  useListNfcDevices,
  getListNfcDevicesQueryKey,
  useRegisterNfcDevice,
  useUpdateNfcDevice,
  useDeleteNfcDevice,
  useAssignNfcDevice,
  useUnassignNfcDevice,
  useSetNfcDeviceStatus,
  type NfcDevice,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  SmartphoneNfc,
  MoreHorizontal,
  Plus,
  Link2,
  Unlink,
  Power,
  PowerOff,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-secondary text-secondary-foreground",
  ASSIGNED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  DISABLED: "bg-red-500/10 text-red-600 dark:text-red-400",
};

interface DeviceFormState {
  uid: string;
  name: string;
  notes: string;
}

export default function NfcDevices() {
  const { isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<NfcDevice | null>(null);
  const [deleteDevice, setDeleteDevice] = useState<NfcDevice | null>(null);
  const [assignDevice, setAssignDevice] = useState<NfcDevice | null>(null);
  const [form, setForm] = useState<DeviceFormState>({ uid: "", name: "", notes: "" });
  const [assignBusinessId, setAssignBusinessId] = useState("");
  const [assignCampaignId, setAssignCampaignId] = useState("");

  const devicesQueryKey = getListNfcDevicesQueryKey();
  const { data, isLoading } = useListNfcDevices(undefined, {
    query: { enabled: !!isSignedIn, queryKey: devicesQueryKey },
  });
  const devices = data?.devices ?? [];

  const { data: businessData } = useListBusinesses(
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
    if (assignDevice) {
      setAssignBusinessId(assignDevice.businessId ?? businesses[0]?.id ?? "");
      setAssignCampaignId(assignDevice.campaignId ?? "");
    }
  }, [assignDevice, businesses]);

  const { data: assignCampaignData } = useListCampaigns(
    { businessId: assignBusinessId, includeArchived: false },
    {
      query: {
        enabled: !!assignBusinessId && !!assignDevice,
        queryKey: getListCampaignsQueryKey({
          businessId: assignBusinessId,
          includeArchived: false,
        }),
      },
    },
  );
  const assignCampaigns = assignCampaignData?.campaigns ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: devicesQueryKey });

  const onError = (err: unknown) => {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? "Something went wrong. Please try again.";
    toast({ title: message, variant: "destructive" });
  };

  const registerMutation = useRegisterNfcDevice({
    mutation: {
      onSuccess: () => {
        invalidate();
        setRegisterOpen(false);
        toast({ title: "NFC device registered" });
      },
      onError,
    },
  });
  const updateMutation = useUpdateNfcDevice({
    mutation: {
      onSuccess: () => {
        invalidate();
        setEditDevice(null);
        toast({ title: "Device updated" });
      },
      onError,
    },
  });
  const deleteMutation = useDeleteNfcDevice({
    mutation: {
      onSuccess: () => {
        invalidate();
        setDeleteDevice(null);
        toast({ title: "Device removed" });
      },
      onError,
    },
  });
  const assignMutation = useAssignNfcDevice({
    mutation: {
      onSuccess: () => {
        invalidate();
        setAssignDevice(null);
        toast({ title: "Device assigned to campaign" });
      },
      onError,
    },
  });
  const unassignMutation = useUnassignNfcDevice({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Assignment removed" });
      },
      onError,
    },
  });
  const statusMutation = useSetNfcDeviceStatus({
    mutation: {
      onSuccess: (device) => {
        invalidate();
        toast({
          title:
            device.status === "ACTIVE" ? "Device activated" : "Device disabled",
        });
      },
      onError,
    },
  });

  const openRegister = () => {
    setForm({ uid: "", name: "", notes: "" });
    setRegisterOpen(true);
  };

  const openEdit = (device: NfcDevice) => {
    setForm({ uid: device.uid, name: device.name, notes: device.notes ?? "" });
    setEditDevice(device);
  };

  const copyTapLink = async (device: NfcDevice) => {
    if (!device.redirectPath) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${device.redirectPath}`,
      );
      toast({ title: "Tap link copied" });
    } catch {
      toast({ title: "Couldn't copy the link", variant: "destructive" });
    }
  };

  if (isLoaded && !isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  const formValid = form.uid.trim().length > 0 && form.name.trim().length > 0;

  return (
    <AppLayout title="NFC Devices">
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              NFC Devices
            </h2>
            <p className="text-muted-foreground mt-1">
              Register your tap-to-review tags and standees, then assign each
              one to a campaign. Each device gets its own permanent tap link.
            </p>
          </div>
          <Button onClick={openRegister} className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Register Device
          </Button>
        </div>

        {isLoading ? (
          <Card className="shadow-sm border-border">
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : devices.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-4">
                <SmartphoneNfc className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground">No NFC devices yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Register a device using the UID printed on your NFC tag or
                standee, then assign it to a campaign.
              </p>
              <Button onClick={openRegister} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Register Device
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead className="hidden md:table-cell">UID</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Assigned</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{device.name}</div>
                      {device.notes && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {device.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code className="text-xs text-muted-foreground">{device.uid}</code>
                    </TableCell>
                    <TableCell>
                      {device.campaignName ? (
                        <div>
                          <div className="text-sm">{device.campaignName}</div>
                          {device.businessName && (
                            <div className="text-xs text-muted-foreground">
                              {device.businessName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[device.status] ?? ""} variant="outline">
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {device.assignedAt
                        ? new Date(device.assignedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setAssignDevice(device)}>
                            <Link2 className="w-4 h-4 mr-2" />
                            {device.campaignId ? "Reassign" : "Assign to campaign"}
                          </DropdownMenuItem>
                          {device.campaignId && (
                            <DropdownMenuItem
                              onClick={() => unassignMutation.mutate({ id: device.id })}
                            >
                              <Unlink className="w-4 h-4 mr-2" />
                              Remove assignment
                            </DropdownMenuItem>
                          )}
                          {device.redirectPath && (
                            <DropdownMenuItem onClick={() => copyTapLink(device)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy tap link
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {device.status !== "ACTIVE" && device.campaignId && (
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: device.id,
                                  data: { status: "ACTIVE" },
                                })
                              }
                            >
                              <Power className="w-4 h-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {device.status !== "DISABLED" && (
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: device.id,
                                  data: { status: "DISABLED" },
                                })
                              }
                            >
                              <PowerOff className="w-4 h-4 mr-2" />
                              Disable
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openEdit(device)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteDevice(device)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Register / Edit dialog */}
      <Dialog
        open={registerOpen || editDevice !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRegisterOpen(false);
            setEditDevice(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editDevice ? "Edit NFC device" : "Register NFC device"}
            </DialogTitle>
            <DialogDescription>
              Use the UID printed on the tag (or reported by your NFC reader).
              Hardware writing isn't required — assignment is handled in
              software.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nfc-uid">Device UID</Label>
              <Input
                id="nfc-uid"
                placeholder="e.g. 04:A2:2B:9C:11:80"
                value={form.uid}
                onChange={(e) => setForm({ ...form, uid: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nfc-name">Device name</Label>
              <Input
                id="nfc-name"
                placeholder="e.g. Checkout counter standee"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nfc-notes">Notes (optional)</Label>
              <Textarea
                id="nfc-notes"
                placeholder="Location, batch, anything useful"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!formValid || registerMutation.isPending || updateMutation.isPending}
              onClick={() => {
                const payload = {
                  uid: form.uid.trim(),
                  name: form.name.trim(),
                  notes: form.notes.trim() ? form.notes.trim() : null,
                };
                if (editDevice) {
                  updateMutation.mutate({ id: editDevice.id, data: payload });
                } else {
                  registerMutation.mutate({ data: payload });
                }
              }}
            >
              {editDevice ? "Save changes" : "Register device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog
        open={assignDevice !== null}
        onOpenChange={(open) => {
          if (!open) setAssignDevice(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to campaign</DialogTitle>
            <DialogDescription>
              The device's tap link will point at this campaign's review page.
              You can reassign anytime without touching the physical tag.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business</Label>
              <Select
                value={assignBusinessId}
                onValueChange={(value) => {
                  setAssignBusinessId(value);
                  setAssignCampaignId("");
                }}
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select
                value={assignCampaignId}
                onValueChange={setAssignCampaignId}
                disabled={!assignBusinessId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {assignCampaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignBusinessId && assignCampaigns.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  This business has no campaigns yet.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!assignCampaignId || assignMutation.isPending}
              onClick={() => {
                if (!assignDevice) return;
                assignMutation.mutate({
                  id: assignDevice.id,
                  data: { campaignId: assignCampaignId },
                });
              }}
            >
              Assign device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteDevice !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteDevice(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this device?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDevice?.name} will be removed and its tap link will stop
              working. Past tap analytics are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteDevice) deleteMutation.mutate({ id: deleteDevice.id });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
