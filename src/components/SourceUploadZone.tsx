import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Progress } from "@/components/ui/progress";
import { UpgradePrompt } from "./subscription";

// Premium document upload: private files analyzed through the same pipeline as
// public URLs. Free users see the upgrade path; the server is the real gate.
const ACCEPT = ".pdf,.txt,.md,.csv,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.webp";
const ALLOWED_EXT = ["pdf", "txt", "md", "csv", "docx", "xlsx", "xls", "png", "jpg", "jpeg", "webp"];
const MAX_BYTES = 20 * 1024 * 1024;

interface SourceUploadZoneProps {
  /** True for paid tiers. When false, the dropzone is replaced by an upgrade prompt. */
  isPremium: boolean;
  /** False when the monthly analysis quota is reached. */
  canAnalyze: boolean;
  activeProfile: unknown | null;
  activeProfileId: string | null;
  onAnalyzed?: () => void;
}

export const SourceUploadZone = ({
  isPremium,
  canAnalyze,
  activeProfile,
  activeProfileId,
  onAnalyzed,
}: SourceUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const { refreshSubscription } = useSubscription();

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_EXT.includes(ext)) {
        toast({
          title: "Unsupported file type",
          description: "Supported files: PDF, TXT, Markdown, CSV, DOCX, Excel (XLSX/XLS), and images (PNG/JPG/WEBP).",
          variant: "destructive",
        });
        return;
      }
      if (file.size > MAX_BYTES) {
        toast({
          title: "File too large",
          description: "Maximum file size is 20MB.",
          variant: "destructive",
        });
        return;
      }

      setDone(false);
      setFileName(file.name);
      setUploading(true);
      setProgress(20);

      let uploadedPath: string | null = null;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        uploadedPath = filePath;
        setProgress(40);

        const { error: uploadError } = await supabase.storage
          .from("source-uploads")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        setProgress(60);
        setUploading(false);
        setAnalyzing(true);
        setProgress(70);

        const { data, error } = await supabase.functions.invoke("analyze-episode", {
          body: {
            sourceFilePath: filePath,
            sourceFileName: file.name,
            startupProfile: activeProfile ?? undefined,
            startupProfileId: activeProfileId ?? undefined,
          },
        });

        setProgress(90);

        if (error) {
          // Surface the server's actionable message (premium gate, quota, extraction).
          let message = "Could not analyze the document. Please try again.";
          try {
            const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
            if (body?.error) message = body.error;
          } catch {
            /* fall back to generic message */
          }
          throw new Error(message);
        }
        if (data?.error) throw new Error(data.error);

        // The edge function already removed the raw file after extraction, but if it
        // failed before that, the catch below cleans up. On success, nothing to clean.
        uploadedPath = null;
        setProgress(100);
        setDone(true);
        toast({
          title: "Document analyzed",
          description: "Your analysis is ready in your library.",
        });
        await refreshSubscription();
        window.dispatchEvent(new CustomEvent("episodeAnalyzed"));
        onAnalyzed?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not analyze the document. Please try again.";
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage
            .from("source-uploads")
            .remove([uploadedPath]);
          if (cleanupError) {
            console.warn("Could not clean up failed upload:", cleanupError.message);
          }
        }
        console.error("Source upload/analyze error:", err);
        toast({
          title: "Analysis failed",
          description: message,
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        setAnalyzing(false);
        setTimeout(() => {
          setProgress(0);
          setFileName(null);
          setDone(false);
        }, 2500);
      }
    },
    [activeProfile, activeProfileId, onAnalyzed, refreshSubscription, toast],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  // Free users: show the upgrade path instead of the dropzone. Server enforces this too.
  if (!isPremium) {
    return (
      <div className="max-w-xl mx-auto">
        <UpgradePrompt
          feature="upload"
          message="Upload private docs, PDFs, notes & screenshots — analyze materials you can't share as a public link."
        />
      </div>
    );
  }

  const isProcessing = uploading || analyzing;

  return (
    <div className="max-w-xl mx-auto space-y-2">
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : isProcessing
            ? "border-muted bg-muted/20"
            : canAnalyze
            ? "border-muted-foreground/25 hover:border-primary/50"
            : "border-muted-foreground/15 opacity-60"
        }`}
        onDragOver={(e) => {
          if (!canAnalyze || isProcessing) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          if (!canAnalyze || isProcessing) {
            e.preventDefault();
            return;
          }
          handleDrop(e);
        }}
      >
        {isProcessing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {analyzing ? "AI is analyzing your document..." : `Uploading ${fileName}...`}
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        ) : (
          <label className={canAnalyze ? "cursor-pointer block" : "cursor-not-allowed block"}>
            <input
              type="file"
              className="hidden"
              accept={ACCEPT}
              onChange={handleFileInput}
              disabled={isProcessing || !canAnalyze}
            />
            <div className="flex flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground">
              {done ? (
                <span className="inline-flex items-center gap-2 text-success">
                  <FileText className="w-4 h-4" /> Document analyzed successfully!
                </span>
              ) : !canAnalyze ? (
                <span className="inline-flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Monthly analysis limit reached — upgrade for more.
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>
                      Drop a document here or <span className="text-primary underline">browse</span>
                    </span>
                  </span>
                  <span className="text-xs">PDF, TXT, Markdown, CSV, DOCX, XLSX/XLS, or an image · up to 20MB</span>
                </>
              )}
            </div>
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Private uploads are never shared. We analyze the text and delete the file afterward.
      </p>
    </div>
  );
};
