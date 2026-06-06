import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bot, Building2, Folder, Lightbulb, MessageSquare, Play, Sparkles, User } from "lucide-react";
import {
  SAMPLE_PROFILE,
  SAMPLE_VIDEO,
  SAMPLE_FOLDERS,
  SAMPLE_INSIGHTS,
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
    <section id="demo" className="container mx-auto px-4 py-12 sm:py-16 md:py-24 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Illustrative sample — not a real analysis
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
          <TabsContent value="insights" className="mt-4 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {SAMPLE_INSIGHTS.map((insight, i) => (
              <div key={i} className="rounded-xl border bg-card p-3 sm:p-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {i + 1}
                  </span>
                  <div className="space-y-2 min-w-0">
                    <p className="text-sm leading-relaxed">{insight.text}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">Impact {insight.impact}/10</Badge>
                      <Badge variant="outline" className="text-[10px]">Actionability {insight.actionability}/10</Badge>
                      {insight.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">#{tag}</Badge>
                      ))}
                    </div>
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
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="mt-1 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed text-left ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="mt-1 h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            <p className="text-center text-[11px] text-muted-foreground pt-2">
              Ask-the-video chat is available on The Boardroom plan.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};
