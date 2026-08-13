/**
 * Internal App Store screenshot studio.
 * Renders production UI patterns with rights-cleared SAMPLE_* data so captures
 * can be taken without a seeded demo account. Not linked from product nav.
 */
import { useEffect, useMemo } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  CirclePlay,
  Download,
  FileDown,
  FileJson,
  FileSpreadsheet,
  FileText,
  Folder,
  Globe,
  Lightbulb,
  MessageSquare,
  Search,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SAMPLE_BUSINESS_PROFILES,
  SAMPLE_CHAT,
  SAMPLE_INSIGHT_GROUPS,
  SAMPLE_PRIMARY_NAME,
  SAMPLE_VIDEO,
} from "@/lib/sampleDemoData";
import { cn } from "@/lib/utils";

const FRAMES = [
  "action",
  "operating-memo",
  "source-grounded",
  "lessons-risks-actions",
  "follow-up-qa",
  "library",
  "search",
  "save-share",
] as const;

type FrameId = (typeof FRAMES)[number];

const LIBRARY_ITEMS = [
  {
    title: SAMPLE_VIDEO.title,
    profile: SAMPLE_PRIMARY_NAME,
    folder: "GTM",
    tags: ["Sales", "Hiring"],
  },
  {
    title: "Pricing Power Before Series A",
    profile: SAMPLE_PRIMARY_NAME,
    folder: "Fundraising",
    tags: ["Pricing", "Narrative"],
  },
  {
    title: "When Focus Beats Feature Velocity",
    profile: "HelixMind AI",
    folder: "Positioning",
    tags: ["Focus", "Strategy"],
  },
  {
    title: "Regulatory Path Without Stalling Build",
    profile: "Aegis Atomics",
    folder: "Regulatory Path",
    tags: ["Ops", "Risk"],
  },
];

const ScorePill = ({ label, score }: { label: string; score: number }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
    {label}
    <span className="font-semibold">{score}/10</span>
  </span>
);

const StatusBar = ({ dark }: { dark?: boolean }) => (
  <div
    className={cn(
      "flex items-center justify-between px-6 pt-3 pb-1 text-[13px] font-semibold tracking-tight",
      dark ? "text-white/90" : "text-foreground",
    )}
    aria-hidden
  >
    <span>9:41</span>
    <div className="flex items-center gap-1.5 opacity-80">
      <span className="text-[11px]">●●●●</span>
      <span className="text-[11px]">Wi‑Fi</span>
      <span className="rounded-[3px] border border-current px-1 text-[10px] leading-4">100</span>
    </div>
  </div>
);

const AppTopBar = ({ title }: { title?: string }) => (
  <div className="glass-nav hairline-b px-4 py-3 flex items-center justify-between gap-3">
    <BrandLogo className="h-7 w-auto" />
    {title ? (
      <span className="text-xs font-medium text-muted-foreground truncate">{title}</span>
    ) : (
      <Badge variant="secondary" className="text-[11px]">
        Analyzing as {SAMPLE_PRIMARY_NAME}
      </Badge>
    )}
  </div>
);

const BottomNav = ({ active }: { active: "profiles" | "saved" | "lens" | "shared" | "settings" }) => (
  <nav className="glass-nav hairline-t mt-auto px-1 pt-1.5 pb-3" aria-hidden>
    <div className="relative flex items-end justify-around h-14">
      {(
        [
          ["profiles", Building2, "Profiles"],
          ["saved", Bookmark, "Saved"],
          ["lens", Sparkles, SAMPLE_PRIMARY_NAME],
          ["shared", Share2, "Shared"],
          ["settings", SettingsIcon, "Settings"],
        ] as const
      ).map(([id, Icon, label]) => {
        const isActive = active === id;
        const isLens = id === "lens";
        return (
          <div
            key={id}
            className={cn(
              "flex flex-col items-center justify-center flex-1 gap-0.5",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full",
                isLens
                  ? "h-11 w-11 -mt-4 bg-primary text-primary-foreground shadow-md"
                  : cn("px-3.5 py-0.5", isActive && "bg-primary/10"),
              )}
            >
              <Icon className={cn(isLens ? "h-5 w-5" : "h-5 w-5")} strokeWidth={isActive ? 2.5 : 2} />
            </span>
            <span className={cn("text-[10px] leading-tight", isActive ? "font-semibold" : "font-medium")}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  </nav>
);

const Shell = ({
  children,
  nav = "lens",
  title,
  wide,
}: {
  children: React.ReactNode;
  nav?: "profiles" | "saved" | "lens" | "shared" | "settings";
  title?: string;
  wide?: boolean;
}) => (
  <div
    data-screenshot-root
    className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col"
  >
    <StatusBar />
    <AppTopBar title={title} />
    <div className={cn("flex-1 overflow-hidden", wide ? "px-10 py-8" : "px-4 py-4")}>{children}</div>
    {!wide && <BottomNav active={nav} />}
  </div>
);

function ActionFrame({ wide }: { wide?: boolean }) {
  const lead = SAMPLE_INSIGHT_GROUPS[0];
  return (
    <Shell wide={wide} title="Operating memo">
      <div className={cn("space-y-4", wide && "max-w-4xl mx-auto")}>
        <Card className="relative overflow-hidden p-4 sm:p-6">
          <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "var(--gradient-primary)" }} />
          <Badge variant="secondary" className="text-[11px] mb-2">
            Analyzed for {SAMPLE_PRIMARY_NAME}
          </Badge>
          <h1 className="text-title-3 sm:text-title-2 mb-1">{SAMPLE_VIDEO.title}</h1>
          <p className="text-sm text-muted-foreground">{SAMPLE_VIDEO.source}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Seed</Badge>
            <Badge variant="outline">B2B SaaS</Badge>
            <Badge variant="outline">GTM</Badge>
          </div>
        </Card>
        <Card className="glass relative overflow-hidden p-4 sm:p-6 border-primary/15">
          <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "var(--gradient-primary)" }} />
          <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-4 w-4" />
            </span>
            Next move for {SAMPLE_PRIMARY_NAME}
          </h2>
          <div className="rounded-xl border border-primary/15 bg-primary/8 p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{lead.title}</p>
            <p className="text-body-lg leading-relaxed">{lead.tailored}</p>
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-px flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  1
                </span>
                Run ten founder-led closes and log every objection verbatim.
              </li>
              <li className="flex gap-2">
                <span className="mt-px flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  2
                </span>
                Hire only after the same three objections drive most losses.
              </li>
            </ol>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

function OperatingMemoFrame({ wide }: { wide?: boolean }) {
  return (
    <Shell wide={wide} nav="lens">
      <div className={cn("space-y-6", wide && "max-w-2xl mx-auto")}>
        <div className="space-y-2 text-center">
          <h2 className="text-title-2">
            New <span className="font-display font-medium italic text-gradient">analysis</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Paste almost any public link — article, post, newsletter, video, or podcast — and get a memo tailored to your company
          </p>
        </div>
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="series">By Source</TabsTrigger>
            <TabsTrigger value="url">Direct URL</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-center block">Source URL</label>
              <Input
                readOnly
                value="https://example.com/seed-stage-gtm-playbook"
                className="rounded-full text-center text-base py-6 min-h-[48px] shadow-sm"
              />
              <p className="text-xs text-muted-foreground text-center">Source will be auto-detected</p>
            </div>
          </TabsContent>
        </Tabs>
        <Card className="p-4 border-dashed">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Analyzing as {SAMPLE_PRIMARY_NAME}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Seed · B2B SaaS · RevOps software</p>
            </div>
          </div>
        </Card>
        <Button className="w-full min-h-[48px] rounded-full text-base">
          Generate operating memo
        </Button>
      </div>
    </Shell>
  );
}

function SourceGroundedFrame({ wide }: { wide?: boolean }) {
  const group = SAMPLE_INSIGHT_GROUPS[0];
  return (
    <Shell wide={wide} title="Source grounding">
      <div className={cn(wide ? "grid grid-cols-2 gap-6 max-w-5xl mx-auto" : "space-y-4")}>
        <Card className="p-4 sm:p-5 space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-foreground/70">From the source</p>
          <h3 className="font-semibold text-lg">{group.title}</h3>
          <p className="text-base leading-relaxed text-foreground">{group.general}</p>
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground/80">Grounded in transcript · </span>
            Operator playbook, section on founder-led sales repeatability.
          </div>
        </Card>
        <Card className="p-4 sm:p-5 space-y-3 border-primary/20 bg-primary/5">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Lesson for {SAMPLE_PRIMARY_NAME}
          </p>
          <p className="text-base leading-relaxed">{group.tailored}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <ScorePill label="Relevance" score={9} />
            <ScorePill label="Impact" score={8} />
            <ScorePill label="Action" score={9} />
          </div>
        </Card>
      </div>
    </Shell>
  );
}

function LessonsFrame({ wide }: { wide?: boolean }) {
  const lessons = SAMPLE_INSIGHT_GROUPS.slice(0, wide ? 4 : 3);
  return (
    <Shell wide={wide} title="Memo sections">
      <div className={cn(wide ? "grid grid-cols-2 gap-5 max-w-5xl mx-auto" : "space-y-4")}>
        <Card className="min-w-0 p-4 sm:p-6">
          <h2 className="text-title-3 mb-1 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </span>
            Top Lessons
          </h2>
          <p className="text-sm text-muted-foreground mb-4 ml-10">Generic takeaways from the source</p>
          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.title}
                className="relative rounded-2xl border border-border/70 bg-background/40 p-4 pl-5"
              >
                <div aria-hidden className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-primary/60" />
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-display text-2xl font-medium italic leading-none text-primary/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Badge variant="outline">{lesson.title}</Badge>
                </div>
                <p className="text-sm leading-relaxed line-clamp-4">{lesson.general}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="glass relative min-w-0 overflow-hidden p-4 sm:p-6 border-primary/15">
          <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "var(--gradient-primary)" }} />
          <h2 className="text-title-3 mb-1 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-4 w-4" />
            </span>
            Risks & next moves
          </h2>
          <p className="text-sm text-muted-foreground mb-4 ml-10">Mapped to {SAMPLE_PRIMARY_NAME}</p>
          <div className="space-y-3">
            {lessons.slice(0, 2).map((lesson) => (
              <div key={lesson.title} className="rounded-2xl border border-primary/15 bg-card p-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{lesson.title}</p>
                <p className="text-sm leading-relaxed line-clamp-5">{lesson.tailored}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-border/70 bg-accent/5 p-4 flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Lightbulb className="h-3.5 w-3.5" />
              </span>
              <p className="text-sm leading-relaxed">
                Binding constraint: prove a repeatable founder-led sales motion before adding headcount or a second product line.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

function FollowUpFrame({ wide }: { wide?: boolean }) {
  return (
    <Shell wide={wide} title="Ask the video">
      <div className={cn("flex flex-col h-full min-h-[70vh]", wide && "max-w-3xl mx-auto")}>
        <Card className="p-3 mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{SAMPLE_VIDEO.title}</p>
            <p className="text-xs text-muted-foreground">Follow-ups for {SAMPLE_PRIMARY_NAME}</p>
          </div>
        </Card>
        <div className="flex-1 space-y-3 overflow-hidden">
          {SAMPLE_CHAT.map((message, i) => (
            <div
              key={i}
              className={cn("flex items-end gap-2.5", message.role === "user" ? "justify-end" : "justify-start")}
            >
              {message.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <CirclePlay className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border shadow-sm",
                )}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="h-7 w-7 rounded-full bg-muted text-foreground/80 flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-full border bg-card px-4 py-3 text-sm text-muted-foreground">
          Ask a follow-up for {SAMPLE_PRIMARY_NAME}…
        </div>
      </div>
    </Shell>
  );
}

function LibraryFrame({ wide }: { wide?: boolean }) {
  const profile = SAMPLE_BUSINESS_PROFILES[0];
  return (
    <Shell wide={wide} nav="saved" title="Library">
      <div className={cn(wide ? "grid grid-cols-[240px_1fr] gap-6 max-w-5xl mx-auto" : "space-y-4")}>
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{profile.name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.stageOrType.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Folders</p>
            {profile.folders.map((folder) => (
              <div key={folder.id} className="flex items-center gap-2 rounded-lg border p-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: folder.color }} />
                <span className="text-sm">{folder.title}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-title-3 flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              Founder intelligence
            </h2>
            <Badge variant="secondary">{LIBRARY_ITEMS.length} memos</Badge>
          </div>
          {LIBRARY_ITEMS.map((item) => (
            <Card key={item.title} className="p-4 space-y-2">
              <p className="font-semibold leading-snug">{item.title}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {item.profile}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  {item.folder}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[11px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function SearchFrame({ wide }: { wide?: boolean }) {
  const results = LIBRARY_ITEMS.filter((i) => /sales|pricing|focus/i.test(i.title + i.tags.join(" ")));
  return (
    <Shell wide={wide} nav="saved" title="Search">
      <div className={cn("space-y-4", wide && "max-w-3xl mx-auto")}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input readOnly value="founder-led sales" className="pl-10 rounded-full min-h-[48px]" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["Sales", "Hiring", "Pricing", "Focus"].map((pin, i) => (
            <Badge key={pin} variant={i === 0 ? "default" : "outline"} className="rounded-full px-3 py-1">
              {pin}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{results.length} insights match your filters</p>
        {results.map((item) => (
          <Card key={item.title} className="p-4 border-primary/20 bg-primary/5">
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Saved under {item.folder} · {item.profile}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[11px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
        <Card className="p-4">
          <p className="text-sm font-medium mb-2">Topic facets</p>
          <div className="space-y-2">
            {[
              ["Sales motion", 6],
              ["First hire", 4],
              ["Fundraising narrative", 3],
            ].map(([label, count]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{count} sources</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}

function SaveShareFrame({ wide }: { wide?: boolean }) {
  return (
    <Shell wide={wide} title="Export & share">
      <div className={cn("space-y-4", wide && "max-w-xl mx-auto")}>
        <Button variant="ghost" className="-ml-2 mb-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to memo
        </Button>
        <Card className="p-4 space-y-2">
          <h1 className="text-title-3">{SAMPLE_VIDEO.title}</h1>
          <p className="text-sm text-muted-foreground">Analyzed for {SAMPLE_PRIMARY_NAME}</p>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" size="sm" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />
              Invite
            </Button>
          </div>
        </Card>
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold text-lg">Export Executive Summary</h2>
          <Button className="w-full justify-start">
            <FileDown className="w-4 h-4 mr-2" />
            Download Executive Summary (PDF)
          </Button>
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or export raw data</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export as CSV
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <FileJson className="w-4 h-4 mr-2" />
            Export as JSON
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <FileText className="w-4 h-4 mr-2" />
            Export as Markdown
          </Button>
        </Card>
        <Card className="p-4 flex items-start gap-3">
          <Globe className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium text-sm">Share the memo with your co-founder</p>
            <p className="text-xs text-muted-foreground mt-1">
              Invite collaborators to comment on lessons and action items without leaving the library.
            </p>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

const FRAME_MAP: Record<FrameId, (p: { wide?: boolean }) => JSX.Element> = {
  action: ActionFrame,
  "operating-memo": OperatingMemoFrame,
  "source-grounded": SourceGroundedFrame,
  "lessons-risks-actions": LessonsFrame,
  "follow-up-qa": FollowUpFrame,
  library: LibraryFrame,
  search: SearchFrame,
  "save-share": SaveShareFrame,
};

const ScreenshotStudio = () => {
  const { frame } = useParams<{ frame: string }>();
  const [params] = useSearchParams();
  const wide = params.get("device") === "ipad";

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.body.style.background = "hsl(var(--background))";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  const Frame = useMemo(() => {
    if (!frame || !FRAMES.includes(frame as FrameId)) return null;
    return FRAME_MAP[frame as FrameId];
  }, [frame]);

  if (!Frame) {
    return <Navigate to="/__screenshots/action" replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <Frame wide={wide} />
    </div>
  );
};

export default ScreenshotStudio;
export { FRAMES };
