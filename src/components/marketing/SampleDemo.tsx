import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, CirclePlay, Folder, Lightbulb, MessageSquare, Play, User } from "lucide-react";
import {
  SAMPLE_PROFILE,
  SAMPLE_VIDEO,
  SAMPLE_FOLDERS,
  SAMPLE_INSIGHT_GROUPS,
  SAMPLE_CHAT,
} from "@/lib/sampleDemoData";

/**
 * Marketing "See it in action" demo built entirely from fictional sample data
 * (see src/lib/sampleDemoData.ts). No real video, person, or network calls —
 * purely illustrative so prospects can visualize profiles, insights, folders,
 * and the ask-the-video chat before signing up.
 */
export const SampleDemo = () => {
  return (
    <section id="demo" className="container mx-auto px-4 pt-4 sm:pt-6 md:pt-8 pb-12 sm:pb-16 md:pb-24 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-8 sm:mb-10">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Illustrative sample — not a real analysis
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">See it in action</h2>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Here's what an analysis looks like for a bootstrapped coffee roaster — your output adapts
            to your own business, industry, and stage.
          </p>
        </div>

        {/* Sample "analyzed video" header */}
        <div className="glass rounded-2xl p-4 sm:p-5 mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Play className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm sm:text-base truncate">{SAMPLE_VIDEO.title}</p>
            <p className="text-xs text-muted-foreground truncate">{SAMPLE_VIDEO.source}</p>
          </div>
          <Badge variant="secondary" className="ml-auto hidden sm:inline-flex">
            {SAMPLE_PROFILE.industry}
          </Badge>
        </div>

        <Tabs defaultValue="insights" className="glass rounded-2xl p-3 sm:p-5">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights" className="text-xs sm:text-sm">
              <Lightbulb className="h-4 w-4 mr-1 sm:mr-2" /> Insights
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-xs sm:text-sm">
              <Building2 className="h-4 w-4 mr-1 sm:mr-2" /> Profile &amp; Folders
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" /> Ask the video
            </TabsTrigger>
          </TabsList>

          {/* Insights */}
          <TabsContent value="insights" className="mt-4 space-y-5 max-h-[32rem] overflow-y-auto pr-1">
            {SAMPLE_INSIGHT_GROUPS.map((group) => (
              <div key={group.title} className="rounded-xl border bg-card p-4 sm:p-5 text-left space-y-4">
                <h3 className="font-semibold text-sm sm:text-base">{group.title}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-background/50 p-3 sm:p-4 space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      General insight
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/90">{group.general}</p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4 space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                      Tailored to Maple &amp; Oak
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/90">{group.tailored}</p>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Profile & Folders */}
          <TabsContent value="profile" className="mt-4 grid gap-4 sm:grid-cols-2 text-left">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Business profile</span>
              </div>
              <p className="font-medium">{SAMPLE_PROFILE.company_name}</p>
              <div className="flex flex-wrap gap-1.5 my-2">
                <Badge variant="secondary" className="text-[10px]">{SAMPLE_PROFILE.industry}</Badge>
                <Badge variant="outline" className="text-[10px]">{SAMPLE_PROFILE.stage}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{SAMPLE_PROFILE.description}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Folders</span>
              </div>
              <div className="space-y-2">
                {SAMPLE_FOLDERS.map((folder) => (
                  <div key={folder.name} className="flex items-center gap-2 rounded-lg border p-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: folder.color }} />
                    <span className="text-sm">{folder.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Chat */}
          <TabsContent value="chat" className="mt-4 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {SAMPLE_CHAT.map((message, i) => (
              <div
                key={i}
                className={`flex items-end gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <CirclePlay className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed text-left ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
            <p className="text-center text-[11px] text-muted-foreground/80 pt-1">
              Ask-the-video chat is available on The Boardroom plan.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};
