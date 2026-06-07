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
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { useOnboarding } from "@/hooks/useOnboarding";
import { NotificationSettings } from "@/components/NotificationSettings";
import { SubscriptionSettingsCard } from "@/components/subscription";
import { clearOfflineCache } from "@/lib/offlineCache";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Shield, FileText, LifeBuoy, Mail,
  Sparkles, Building2, Globe, SlidersHorizontal, User, Users, Trash2, Info,
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

  const handleReplayTour = async () => {
    triggerHapticFeedback("light");
    await restartOnboarding();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="glass-nav relative z-50 border-b border-border" style={{ paddingTop: "var(--safe-area-top)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <span className="font-semibold text-sm">Settings</span>
          <ThemeToggle />
        </div>
      </div>

      <div className="despia-scroll">
        <div
          className="container mx-auto px-4 pt-4 md:pt-8 max-w-3xl"
          style={{ paddingBottom: isMobile ? "calc(5rem + var(--safe-area-bottom))" : "2rem" }}
        >
          <div className="space-y-6">
            {/* Active business profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
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
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Library defaults
                </CardTitle>
                <CardDescription>How your analyzed videos are sorted and grouped by default.</CardDescription>
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
                  <Trash2 className="h-5 w-5 text-primary" />
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
              <CardContent>
                <Button variant="ghost" className="justify-start w-full" onClick={handleReplayTour}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Replay product tour
                </Button>
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>App version</span>
                  <span className="font-mono text-xs">{__APP_VERSION__}</span>
                </div>
              </CardContent>
            </Card>

            {/* Legal & account */}
            <Card>
              <CardHeader>
                <CardTitle>Legal & account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <SettingsLink to="/account" icon={User} label="Account & data" />
                <SettingsLink to="/faq" icon={LifeBuoy} label="FAQ" />
                <SettingsLink to="/privacy-policy" icon={Shield} label="Privacy Policy" />
                <SettingsLink to="/terms-of-service" icon={FileText} label="Terms of Service" />
                <Separator className="my-2" />
                <a href="mailto:CA@saintmarlolabs.com" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Contact Support
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
};

const SettingsLink = ({ to, icon: Icon, label }: { to: string; icon: typeof User; label: string }) => (
  <Link to={to} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-sm">
    <Icon className="h-4 w-4 text-muted-foreground" />
    {label}
  </Link>
);

export default Settings;
