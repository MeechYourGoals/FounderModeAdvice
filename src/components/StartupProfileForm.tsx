import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileText } from "lucide-react";
import { IndustrySelect } from "@/components/IndustrySelect";

interface StartupProfile {
  company_name: string;
  company_website: string;
  stage: string;
  funding_raised: string;
  valuation: string;
  employee_count: number;
  industry: string;
  description: string;
  deck_summary?: string;
}

interface SavedProfile {
  id: string;
  company_name: string;
  company_website: string | null;
  stage: string;
  funding_raised: string | null;
  valuation: string | null;
  employee_count: number | null;
  industry: string | null;
  description: string;
  deck_summary?: string | null;
  role?: string | null;
}

interface StartupProfileFormProps {
  onSubmit: (profile: StartupProfile, saveProfile: boolean) => void;
  savedProfiles?: SavedProfile[];
  isAnalyzing?: boolean;
}

export const StartupProfileForm = ({ onSubmit, savedProfiles = [], isAnalyzing = false }: StartupProfileFormProps) => {
  const { toast } = useToast();
  const [saveProfile, setSaveProfile] = useState(false);
  const [useExisting, setUseExisting] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  
  const [formData, setFormData] = useState<StartupProfile>({
    company_name: "",
    company_website: "",
    stage: "",
    funding_raised: "",
    valuation: "",
    employee_count: 0,
    industry: "",
    description: "",
    deck_summary: "",
  });

  // Auto-select if only one profile exists
  useEffect(() => {
    if (savedProfiles.length === 1) {
      setUseExisting(true);
      handleSelectProfile(savedProfiles[0].id);
    }
  }, [savedProfiles]);

  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    const profile = savedProfiles.find(p => p.id === profileId);
    if (profile) {
      setFormData({
        company_name: profile.company_name,
        company_website: profile.company_website || "",
        stage: profile.stage,
        funding_raised: profile.funding_raised || "",
        valuation: profile.valuation || "",
        employee_count: profile.employee_count || 0,
        industry: profile.industry || "",
        description: profile.description,
        deck_summary: profile.deck_summary || "",
      });
    }
  };

  const handleToggleUseExisting = (checked: boolean) => {
    setUseExisting(checked);
    if (checked && savedProfiles.length === 1) {
      handleSelectProfile(savedProfiles[0].id);
    }
    if (!checked) {
      setSelectedProfileId("");
      setFormData({
        company_name: "",
        company_website: "",
        stage: "",
        funding_raised: "",
        valuation: "",
        employee_count: 0,
        industry: "",
        description: "",
        deck_summary: "",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((saveProfile || useExisting) && (!formData.company_name || !formData.stage || !formData.description)) {
      toast({
        title: "Missing Information",
        description: "Please fill in company name, stage, and description to save as a profile.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(formData, saveProfile && !useExisting);
  };

  const selectedProfile = savedProfiles.find(p => p.id === selectedProfileId);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Startup Context (Optional)</CardTitle>
        <CardDescription>
          Skip this step to get universal insights, or fill in your startup details to get personalized recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {savedProfiles.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg gap-3">
              <div className="flex items-center space-x-2 shrink-0">
                <Switch
                  id="use-existing"
                  checked={useExisting}
                  onCheckedChange={handleToggleUseExisting}
                />
                <Label htmlFor="use-existing" className="cursor-pointer">
                  Use Saved Profile
                </Label>
              </div>
              
              {/* Single profile: show name inline */}
              {useExisting && savedProfiles.length === 1 && (
                <span className="text-sm font-medium text-primary truncate">
                  {savedProfiles[0].company_name}
                </span>
              )}

              {/* Multiple profiles: inline dropdown */}
              {useExisting && savedProfiles.length > 1 && (
                <Select value={selectedProfileId} onValueChange={handleSelectProfile}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Choose profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {!useExisting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="save-profile"
                    checked={saveProfile}
                    onCheckedChange={setSaveProfile}
                  />
                  <Label htmlFor="save-profile" className="cursor-pointer">
                    Save as Profile
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground px-4">
                Toggle on to save your startup details and get personalized insights. Leave off to skip personalization and get universal insights only.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name {(saveProfile || useExisting) && "*"}</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder=""
              disabled={useExisting || isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_website">Website URL</Label>
            <Input
              id="company_website"
              type="url"
              value={formData.company_website}
              onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
              placeholder=""
              disabled={useExisting || isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Current Stage {(saveProfile || useExisting) && "*"}</Label>
            <Select
              value={formData.stage}
              onValueChange={(value) => setFormData({ ...formData, stage: value })}
              disabled={useExisting || isAnalyzing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre_seed">Pre-seed</SelectItem>
                <SelectItem value="seed">Seed</SelectItem>
                <SelectItem value="series_a">Series A</SelectItem>
                <SelectItem value="series_b_plus">Series B+</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="bootstrapped">Bootstrapped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="funding_raised">Funding Raised</Label>
              <Input
                id="funding_raised"
                value={formData.funding_raised}
                onChange={(e) => setFormData({ ...formData, funding_raised: e.target.value })}
                placeholder=""
                disabled={useExisting || isAnalyzing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valuation">Valuation</Label>
              <Input
                id="valuation"
                value={formData.valuation}
                onChange={(e) => setFormData({ ...formData, valuation: e.target.value })}
                placeholder=""
                disabled={useExisting || isAnalyzing}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_count">Team Size</Label>
              <Input
                id="employee_count"
                type="number"
                value={formData.employee_count}
                onChange={(e) => setFormData({ ...formData, employee_count: parseInt(e.target.value) || 0 })}
                placeholder=""
                disabled={useExisting || isAnalyzing}
              />
            </div>

            <IndustrySelect
              value={formData.industry}
              onChange={(value) => setFormData({ ...formData, industry: value })}
              disabled={useExisting || isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description {(saveProfile || useExisting) && "*"}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder=""
              className="min-h-[120px]"
              disabled={useExisting || isAnalyzing}
            />
          </div>

          {/* AI Context Summary from deck uploads */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="deck_summary">AI Context Summary</Label>
            </div>
            {formData.deck_summary ? (
              <Textarea
                id="deck_summary"
                value={formData.deck_summary}
                className="min-h-[100px] text-sm bg-muted/50"
                readOnly
                disabled
              />
            ) : (
              <div className="rounded-md border border-dashed border-muted-foreground/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No deck summary available. Upload a pitch deck in your{" "}
                  <span className="font-medium text-foreground">Startup Profile</span>{" "}
                  to generate AI context for more accurate analysis.
                </p>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing episode...
              </>
            ) : (
              "Continue to Analysis"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
