import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Building2,
  CirclePlay,
  Folder,
  Lightbulb,
  MessageSquare,
  Play,
  User,
} from "lucide-react";
import {
  SAMPLE_VIDEO,
  SAMPLE_BUSINESS_PROFILES,
  SAMPLE_INSIGHT_GROUPS,
  SAMPLE_CHAT,
  SAMPLE_PRIMARY_NAME,
} from "@/lib/sampleDemoData";
import demoVideoAsset from "@/assets/demo-video.mp4.asset.json";

/**
 * Marketing "See it in action" demo built entirely from fictional sample data.
 * The play button on the header opens a real product demo video.
 */
export const SampleDemo = () => {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <section
      id="demo"
      className="container mx-auto px-4 pt-4 sm:pt-6 md:pt-8 pb-12 sm:pb-16 md:pb-24 scroll-mt-20"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-8 sm:mb-10">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Illustrative sample — not a real analysis
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            See it{" "}
            <span className="font-display font-medium italic text-gradient">in action</span>
          </h2>
          <p className="text-base sm:text-xl text-foreground/90 max-w-2xl mx-auto">
            Here's what an operating memo looks like for a seed-stage B2B SaaS founder —
            your output adapts to your own company, industry, and stage.
          </p>
        </div>

        {/* Embedded demo video */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-border/60 shadow-elegant bg-card">
          <video
            src={demoVideoAsset.url}
            className="w-full h-auto"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Founder Mode Advice product demo"
          />
        </div>

        {/* Sample "analyzed video" header — play button opens video modal */}
        <div className="glass rounded-2xl p-4 sm:p-5 mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            aria-label="Play product demo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform hover:scale-105 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Play className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="font-semibold text-base sm:text-lg truncate">
              {SAMPLE_VIDEO.title}
            </p>
            <p className="text-sm text-foreground/80 truncate">
              {SAMPLE_VIDEO.source}
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto hidden sm:inline-flex">
            {SAMPLE_BUSINESS_PROFILES[0].stageOrType[0]}
          </Badge>
        </div>

        <Tabs defaultValue="insights" className="glass rounded-2xl p-3 sm:p-5">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights" className="text-sm sm:text-base">
              <Lightbulb className="h-4 w-4 mr-1 sm:mr-2" /> Insights
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-sm sm:text-base">
              <Building2 className="h-4 w-4 mr-1 sm:mr-2" /> Profiles &amp;
              Folders
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-sm sm:text-base">
              <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" /> Ask the video
            </TabsTrigger>
          </TabsList>

          {/* Insights */}
          <TabsContent
            value="insights"
            className="mt-4 space-y-5 max-h-[32rem] overflow-y-auto pr-1"
          >
            {SAMPLE_INSIGHT_GROUPS.map((group) => (
              <div
                key={group.title}
                className="rounded-xl border bg-card p-4 sm:p-5 text-left space-y-4"
              >
                <h3 className="font-semibold text-base sm:text-lg">
                  {group.title}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 sm:items-stretch">
                  <div className="rounded-lg border border-border/60 bg-background/50 p-4 space-y-2 h-full">
                    <p className="text-sm font-medium uppercase tracking-wide text-foreground/70">
                      General insight
                    </p>
                    <p className="text-base leading-relaxed text-foreground">
                      {group.general}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2 h-full">
                    <p className="text-sm font-medium uppercase tracking-wide text-primary">
                      Tailored to {SAMPLE_PRIMARY_NAME}
                    </p>
                    <p className="text-base leading-relaxed text-foreground">
                      {group.tailored}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Profiles & Folders */}
          <TabsContent value="profile" className="mt-4 space-y-4 text-left">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-base font-medium text-foreground">
                Three saved business profiles, each with its own folders
              </p>
              <p className="mt-1 text-sm sm:text-base text-foreground/80">
                Save different businesses, stages, and strategic workstreams
                without mixing context.
              </p>
            </div>

            {SAMPLE_BUSINESS_PROFILES.map((profile) => (
              <div
                key={profile.id}
                className="grid gap-4 md:grid-cols-2 md:items-stretch"
              >
                <div className="rounded-xl border bg-card p-4 h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-base">
                      Business profile
                    </span>
                  </div>
                  <p className="font-medium text-base">{profile.name}</p>
                  <div className="flex flex-wrap gap-1.5 my-2">
                    {profile.stageOrType.map((tag, index) => (
                      <Badge
                        key={tag}
                        variant={index === 0 ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-base leading-relaxed text-foreground/85">
                    {profile.description}
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-4 h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <Folder className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-base">Folders</span>
                  </div>
                  <div className="space-y-2">
                    {profile.folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center gap-2 rounded-lg border p-2"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: folder.color }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 text-base leading-snug break-words">
                          {folder.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Chat */}
          <TabsContent
            value="chat"
            className="mt-4 space-y-3 max-h-[28rem] overflow-y-auto pr-1"
          >
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
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-base leading-relaxed text-left ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border shadow-sm"
                  }`}
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
            <p className="text-center text-sm text-foreground/70 pt-1">
              Ask-the-video chat is available on The Boardroom plan.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Demo video modal triggered by the play button */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-border">
          <DialogTitle className="sr-only">Founder Mode Advice product demo</DialogTitle>
          <video
            src={demoVideoAsset.url}
            className="w-full h-auto"
            controls
            autoPlay
            playsInline
          />
        </DialogContent>
      </Dialog>
    </section>
  );
};
