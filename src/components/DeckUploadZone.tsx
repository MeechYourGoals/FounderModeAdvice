import { useState, useCallback } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface DeckUploadZoneProps {
  onSummaryExtracted: (summary: string) => void;
}

export const DeckUploadZone = ({ onSummaryExtracted }: DeckUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({
        title: "PDF only",
        description: "Please upload a PDF. Export your PowerPoint to PDF and try again.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
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
      setProgress(40);

      const { error: uploadError } = await supabase.storage
        .from("startup-decks")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setProgress(60);
      setUploading(false);
      setAnalyzing(true);
      setProgress(70);

      const { data, error } = await supabase.functions.invoke("parse-deck", {
        body: { fileUrl: filePath },
      });

      setProgress(90);

      if (error) throw error;

      if (data?.summary) {
        onSummaryExtracted(data.summary);
        toast({
          title: "Deck uploaded and summarized",
          description: "Review the AI-generated summary below and edit if needed.",
        });
      } else if (data?.error) {
        throw new Error(data.error);
      }

      setProgress(100);
    } catch (error: any) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from("startup-decks")
          .remove([uploadedPath]);
        if (cleanupError) {
          console.warn("Could not clean up failed deck upload:", cleanupError.message);
        }
      }

      console.error("Deck upload/parse error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Could not analyze the deck. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setTimeout(() => {
        setProgress(0);
        setFileName(null);
      }, 2000);
    }
  }, [onSummaryExtracted, toast]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const isProcessing = uploading || analyzing;

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
        isDragging
          ? "border-primary bg-primary/5"
          : isProcessing
          ? "border-muted bg-muted/20"
          : "border-muted-foreground/25 hover:border-primary/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {isProcessing ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI is analyzing your deck...
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading {fileName}...
              </>
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input
            type="file"
            className="hidden"
            accept=".pdf,application/pdf"
            onChange={handleFileInput}
            disabled={isProcessing}
          />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {fileName && progress === 100 ? (
              <>
                <FileText className="w-4 h-4 text-success" />
                <span className="text-success">Deck analyzed successfully!</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>
                  Drop your pitch deck (PDF) here or <span className="text-primary underline">browse</span>
                </span>
                <span className="text-xs">(PDF only)</span>
              </>
            )}
          </div>
        </label>
      )}
    </div>
  );
};
