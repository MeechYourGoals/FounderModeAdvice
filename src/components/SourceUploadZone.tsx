import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { UpgradePrompt } from "./subscription/UpgradePrompt";
import type { SubscriptionTier } from "@/types/subscription";
import { hasFileUpload } from "@/types/subscription";

const ACCEPTED_TYPES = ".pdf,.txt,.md,.markdown,.csv,text/plain,text/markdown,text/csv,application/pdf";
const MAX_BYTES = 20 * 1024 * 1024;

interface SourceUploadZoneProps {
  tier: SubscriptionTier;
  onAnalyzeUpload: (filePath: string, fileName: string) => Promise<void>;
  disabled?: boolean;
}

export const SourceUploadZone = ({ tier, onAnalyzeUpload, disabled }: SourceUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const canUpload = hasFileUpload(tier);

  const handleFile = useCallback(async (file: File) => {
    if (!canUpload) return;

    const lower = file.name.toLowerCase();
    const okExt = [".pdf", ".txt", ".md", ".markdown", ".csv"].some((ext) => lower.endsWith(ext));
    if (!okExt) {
      toast({
        title: "Unsupported file type",
        description: "Supported uploads: PDF, TXT, MD, and CSV.",
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

    setFileName(file.name);
    setUploading(true);
    setProgress(20);

    let uploadedPath: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      uploadedPath = filePath;
      setProgress(45);

      const { error: uploadError } = await supabase.storage
        .from("source-uploads")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setProgress(70);
      await onAnalyzeUpload(filePath, file.name);
      setProgress(100);
    } catch (error: unknown) {
      if (uploadedPath) {
        await supabase.storage.from("source-uploads").remove([uploadedPath]).catch(() => {});
      }
      const message = error instanceof Error ? error.message : "Upload failed. Please try again.";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(() => {
        setProgress(0);
        setFileName(null);
      }, 1500);
    }
  }, [canUpload, onAnalyzeUpload, toast]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [disabled, handleFile, uploading],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  if (!canUpload) {
    return (
      <div className="space-y-3 max-w-xl mx-auto">
        <div className="relative border-2 border-dashed rounded-xl p-6 text-center border-muted-foreground/25 bg-muted/20">
          <Lock className="mx-auto h-5 w-5 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">Upload private documents</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDFs, notes, memos, and exports — analyze non-public materials with a paid plan.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Supported: PDF, TXT, MD, CSV (up to 20MB)</p>
        </div>
        <UpgradePrompt
          compact
          feature="upload"
          message="Upgrade to upload private files and analyze non-public content."
        />
      </div>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all max-w-xl mx-auto ${
        isDragging
          ? "border-primary bg-primary/5"
          : uploading
          ? "border-muted bg-muted/20"
          : "border-muted-foreground/25 hover:border-primary/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !uploading) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading {fileName}…
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      ) : (
        <label className={`block ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
          <input
            type="file"
            className="hidden"
            accept={ACCEPTED_TYPES}
            onChange={handleFileInput}
            disabled={disabled || uploading}
          />
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Upload className="w-5 h-5" />
            <span>
              Drop a PDF, TXT, MD, or CSV here or <span className="text-primary underline">browse</span>
            </span>
            <span className="text-xs">Private upload · up to 20MB · same analysis as public links</span>
            {fileName && progress === 100 && (
              <span className="inline-flex items-center gap-1 text-success">
                <FileText className="w-4 h-4" /> {fileName} uploaded
              </span>
            )}
          </div>
        </label>
      )}
    </div>
  );
};
