import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SecondaryPageHeader } from "@/components/SecondaryPageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { useOnboarding } from "@/hooks/useOnboarding";
import { NotificationSettings } from "@/components/NotificationSettings";
import { SubscriptionSettingsCard } from "@/components/subscription";
import { clearOfflineCache } from "@/lib/offlineCache";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight, Loader2, Shield, FileText, LifeBuoy, Mail,
  RotateCcw, Building2, Globe, SlidersHorizontal, Sparkles, User, Users, Trash2, Info,
} from "lucide-react";
import {
  getLibraryPrefs, setLibraryPrefs, SORT_LABELS, VIEW_LABELS,
  type LibrarySortColumn, type LibrarySortDirection, type LibraryViewMode,
} from "@/lib/libraryPrefs";

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const { profiles, activeProfileId, setActiveProfileId } = useActiveProfile();
  const { restart: restartOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { toast } = useToast();

  const [prefs, setPrefs] = useState(getLibraryPrefs());
  const [clearing, setClearing] = useState(false);

  const handleClearCache = async () => {
    triggerHapticFeedback("medium");
    setClearing(true);
    try {
      await clearOfflineCache();
      toast({ title: "Offline cache cleared" });
    } catch {
      toast({ title: "Couldn't clear cache", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const updatePref = (patch: Partial<typeof prefs>) => {
    triggerHapticFeedback("light");
    setPrefs(setLibraryPrefs(patch));
  };

  const handleReplayWalkthrough = () => {
    triggerHapticFeedback("light");
    navigate("/", { state: { action: "walkthrough" } });
  };

  const handleRedoSetup = async () => {
    triggerHapticFeedback("light");
    await restartOnboarding();
    navigate("/");
  };

  if (authLoading) {
    return <AppLoadingScreen label="Loading settings..." />;
  }
  if (!user) return null;

  return (
    <div className="app-ambient h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <SecondaryPageHeader title="Settings" onBack={() => navigate("/")} />

      <div className="despia-scroll">
        <div
          className="container mx-auto px-4 pt-4 md:pt-8 max-w-3xl"
          style={{ paddingBottom: isMobile ? "calc(5rem + var(--safe-area-bottom))" : "2rem" }}
        >
          <div className="space-y-6">
            {/* iOS large-title header (the compact bar title stays for wayfinding) */}
            <h1 className="text-large-title px-1 pt-1 md:hidden">Settings</h1>

            {/* Active business profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></span>
                  Default business profile
                </CardTitle>
                <CardDescription>
                  New analyses and video chats are personalized for this business.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={activeProfileId ?? "__none__"}
                  onValueChange={(v) => setActiveProfileId(v === "__none__" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> Universal (no profile)</span>
                    </SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {profiles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No business profiles yet.{" "}
                    <button className="underline hover:text-primary" onClick={() => navigate("/", { state: { panel: "profiles", ts: Date.now() } })}>
                      Create one
                    </button>{" "}
                    to personalize your insights.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Library defaults */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><SlidersHorizontal className="h-4 w-4" /></span>
                  Library defaults
                </CardTitle>
                <CardDescription>How your analyzed sources are sorted and grouped by default.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Sort by</Label>
                  <Select value={prefs.sortColumn} onValueChange={(v) => updatePref({ sortColumn: v as LibrarySortColumn })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SORT_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Select value={prefs.sortDirection} onValueChange={(v) => updatePref({ sortDirection: v as LibrarySortDirection })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest / Z–A</SelectItem>
                      <SelectItem value="asc">Oldest / A–Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>View</Label>
                  <Select value={prefs.viewMode} onValueChange={(v) => updatePref({ viewMode: v as LibraryViewMode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(VIEW_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Switch between light and dark mode.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm">Theme</span>
                <ThemeToggle />
              </CardContent>
            </Card>

            {/* Notifications */}
            <NotificationSettings />

            {/* Offline & storage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Trash2 className="h-4 w-4" /></span>
                  Offline & storage
                </CardTitle>
                <CardDescription>
                  Saved insights and your most recent analysis are cached on this device so they work offline.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleClearCache} disabled={clearing}>
                  {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Clear offline cache
                </Button>
              </CardContent>
            </Card>

            {/* Subscription — canonical plan/billing home */}
            <SubscriptionSettingsCard />

            {/* Getting started */}
            <Card>
              <CardHeader>
                <CardTitle>Getting started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5">
                <Button variant="ghost" className="justify-start w-full" onClick={handleReplayWalkthrough}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Replay app walkthrough
                </Button>
                <Button variant="ghost" className="justify-start w-full" onClick={handleRedoSetup}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Redo quick setup
                </Button>
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Info className="h-4 w-4" /></span>
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground-tertiary space-y-1">
                <div className="flex items-center justify-between">
                  <span>App version</span>
                  <span className="font-mono text-xs tabular-nums">{__APP_VERSION__}</span>
                </div>
              </CardContent>
            </Card>

            {/* Legal & account */}
            <Card>
              <CardHeader>
                <CardTitle>Legal & account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5">
                <SettingsLink to="/account" icon={User} label="Account & data" />
                <SettingsLink to="/faq" icon={LifeBuoy} label="FAQ" />
                <SettingsLink to="/privacy-policy" icon={Shield} label="Privacy Policy" />
                <SettingsLink to="/terms-of-service" icon={FileText} label="Terms of Service" />
                <Separator className="my-2" />
                <a
                  href="mailto:CA@saintmarlolabs.com"
                  className="flex items-center gap-3 px-2 rounded-lg min-h-11 hover:bg-muted active:bg-muted transition-colors text-subhead"
                >
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1">Contact Support</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsLink = ({ to, icon: Icon, label }: { to: string; icon: typeof User; label: string }) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-2 rounded-lg min-h-11 hover:bg-muted active:bg-muted transition-colors text-subhead"
  >
    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
    <span className="flex-1">{label}</span>
    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
  </Link>
);

export default Settings;
