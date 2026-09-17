import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { Check, Settings as SettingsIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  return (
    <AppLayout title="Settings">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <SettingsIcon className="h-4 w-4" />
            Workspace settings
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
          <p className="mt-2 text-muted-foreground">Manage the preferences for your agency workspace.</p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how 5-Star.AI looks on this device.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4 border-t border-border pt-5">
            <div>
              <p className="text-sm font-semibold">Theme</p>
              <p className="mt-1 text-xs text-muted-foreground">Switch between light, dark, or system appearance.</p>
            </div>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Workspace status</CardTitle>
            <CardDescription>Your agency workspace is ready to manage locations and campaigns.</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-border pt-5">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              Workspace active
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}