import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { UsageDisplay, PricingPlans } from "@/components/subscription";
import { ArrowLeft, LogOut, Mail, Calendar, RotateCcw, Shield, FileText, Trash2, ExternalLink, LifeBuoy, Sparkles } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { triggerHapticFeedback } from "@/lib/capacitor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

const Account = () => {
  const { user, loading: authLoading, signOut, deleteAccount } = useAuth();
  const { subscription, loading: subLoading, isNative, restorePurchases, refreshSubscription, manageSubscription } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isDeleting, setIsDeleting] = useState(false);
  const { restart: restartOnboarding } = useOnboarding();

  const handleReplayTour = async () => {
    triggerHapticFeedback('light');
    await restartOnboarding();
    navigate("/");
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    triggerHapticFeedback('light');
    await signOut();
    navigate("/auth");
  };

  const handleRestore = async () => {
    triggerHapticFeedback('medium');
    try {
      await restorePurchases();
      toast({
        title: "Purchases restored",
        description: "Your subscription status has been updated.",
      });
    } catch (error) {
      toast({
        title: "Restore failed",
        description: "Could not restore purchases. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    triggerHapticFeedback('heavy');
    setIsDeleting(true);
    try {
      const { error } = await deleteAccount();
      if (error) throw error;

      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently removed.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "Could not delete account. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || subLoading) {
    return <AppLoadingScreen label="Loading your account..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Mobile/Tablet header - relative top bar with safe area (Despia pattern) */}
      {isMobile ? (
        <div className="glass-nav relative z-50 border-b border-border" style={{ paddingTop: 'var(--safe-area-top)' }}>
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="-ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <span className="font-semibold text-sm">Account</span>
            <ThemeToggle />
          </div>
        </div>
      ) : (
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
      )}

      <div className="despia-scroll">
      <div className="container mx-auto px-4 pt-4 md:pt-8 max-w-4xl" style={{ paddingBottom: isMobile ? 'calc(5rem + var(--safe-area-bottom))' : '2rem' }}>
        {!isMobile && (
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        )}

        <div className="space-y-8">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member since</p>
                  <p className="font-medium">
                    {user.created_at
                      ? format(new Date(user.created_at), "MMMM d, yyyy")
                      : "Unknown"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <Button variant="ghost" onClick={handleReplayTour}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Replay Product Tour
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subscription & Usage */}
          <UsageDisplay showUpgrade />

          {/* Manage Subscription — Customer Center on native, Stripe Portal on web */}
          {subscription?.tier !== "free" && (
            <Card>
              <CardHeader>
                <CardTitle>Manage Subscription</CardTitle>
                <CardDescription>
                  View, modify, or cancel your subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button variant="outline" onClick={() => { triggerHapticFeedback('light'); manageSubscription(); }}>
                  Manage Subscription
                </Button>
                {isNative && (
                  <div className="text-center">
                    <Button variant="ghost" size="sm" onClick={handleRestore}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore Purchases
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subscription Plans */}
          {subscription?.tier !== "series_z" && (
            <Card>
              <CardHeader>
                <CardTitle>Upgrade Your Plan</CardTitle>
                <CardDescription>
                  Unlock more profiles, bookmarks, and video analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PricingPlans />

                {isNative && subscription?.tier === "free" && (
                  <div className="mt-6 text-center">
                    <Button variant="outline" onClick={handleRestore}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore Purchases
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Already subscribed on another device? Restore your purchase.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Period Info */}
          {subscription?.currentPeriodEnd && subscription.tier !== "free" && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    {subscription.cancelAtPeriodEnd
                      ? "Your subscription ends on"
                      : "Your subscription renews on"}
                  </p>
                  <p className="text-lg font-semibold">
                    {format(new Date(subscription.currentPeriodEnd), "MMMM d, yyyy")}
                  </p>
                  {subscription.cancelAtPeriodEnd && (
                    <p className="text-sm text-amber-500 mt-2">
                      Your subscription will not renew. You'll continue to have access until the end date.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legal & Support */}
          <Card>
            <CardHeader>
              <CardTitle>Legal & Support</CardTitle>
              <CardDescription>Privacy policy, terms, and account management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/privacy-policy" onClick={() => triggerHapticFeedback('light')}>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span>Privacy Policy</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>

              <Link to="/terms-of-service" onClick={() => triggerHapticFeedback('light')}>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span>Terms of Service</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>

              <a href="mailto:CA@saintmarlolabs.com" onClick={() => triggerHapticFeedback('light')}>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <LifeBuoy className="h-5 w-5 text-muted-foreground" />
                    <span>Contact Support</span>
                  </div>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>

              <Separator />

              <div className="pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all your data from our servers.
                        {subscription?.tier !== 'free' && (
                          <p className="mt-2 font-semibold text-amber-600">
                            Note: If you have an active subscription, please cancel it in the App Store/Stripe before deleting your account.
                          </p>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete Account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-[10px] text-muted-foreground mt-2 px-2">
                  Deleting your account will remove all bookmarks, profiles, and history. This cannot be undone.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>

      <MobileBottomNav />
    </div>
  );
};

export default Account;
