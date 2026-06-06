import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText, FileSpreadsheet, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import despia from 'despia-native';
import { useDespia } from "@/hooks/use-despia";

interface ExportModalProps {
  episodeId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportModal = ({ episodeId, open, onOpenChange }: ExportModalProps) => {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const isDespia = useDespia();

  const fetchEpisodeData = async (id: string) => {
    const { data: episode } = await supabase
      .from('episodes')
      .select(`
        *,
        companies(*),
        lessons(*, personalized_insights(*)),
        chavel_callouts(*)
      `)
      .eq('id', id)
      .single();
    return episode;
  };

  const fetchAllData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    let query = supabase
      .from('episodes')
      .select(`
        *,
        companies(*),
        lessons(*, personalized_insights(*)),
        chavel_callouts(*)
      `)
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('analyzed_by', user.id);
    }

    const { data: episodes } = await query;
    return episodes;
  };

  const handleExport = async (blob: Blob, filename: string, mimeType: string) => {
    if (isDespia) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const path = `${user.id}/${Date.now()}-${filename}`;

        // Upload to Supabase 'exports' bucket
        const { error: uploadError } = await supabase.storage
          .from('exports')
          .upload(path, blob, {
            contentType: mimeType,
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get signed URL
        const { data: { signedUrl } } = await supabase.storage
          .from('exports')
          .createSignedUrl(path, 3600, {
            download: filename
          }); // 1 hour expiry

        if (!signedUrl) throw new Error("Failed to generate signed URL");

        // Trigger native share
        despia(signedUrl);

        toast({ title: "Sharing initiated", description: "Opening share dialog..." });
        onOpenChange(false);
      } catch (error: any) {
        console.error("Despia export error:", error);
        toast({ title: "Export failed", description: error.message || "Could not share file", variant: "destructive" });
      }
    } else {
      // Standard web download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Export complete", description: `${filename.split('.').pop()?.toUpperCase()} file downloaded` });
      onOpenChange(false);
    }
  };

  const exportJSON = async () => {
    setExporting(true);
    try {
      const data = episodeId ? await fetchEpisodeData(episodeId) : await fetchAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const filename = `founder-lessons-${episodeId ? 'episode' : 'all'}-${new Date().toISOString().split('T')[0]}.json`;

      await handleExport(blob, filename, 'application/json');
    } catch (error) {
      toast({ title: "Export failed", description: "Please try again", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const data = episodeId ? [await fetchEpisodeData(episodeId)] : await fetchAllData();
      
      const csvRows = [];
      csvRows.push(['Episode Title', 'Company', 'Founders', 'Release Date', 'Lesson', 'Category', 'Impact', 'Actionability', 'Personalized Insight', 'Action Items', 'Insight Relevance', 'URL']);
      
      data?.forEach((episode: any) => {
        episode.lessons?.forEach((lesson: any) => {
          const insight = lesson.personalized_insights?.[0];
          const actionItems = insight?.action_items ? 
            (Array.isArray(insight.action_items) ? insight.action_items.join('; ') : JSON.stringify(insight.action_items)) : '';
          
          csvRows.push([
            `"${episode.title?.replace(/"/g, '""') || ''}"`,
            `"${episode.companies?.name?.replace(/"/g, '""') || ''}"`,
            `"${episode.founder_names?.replace(/"/g, '""') || ''}"`,
            episode.release_date || '',
            `"${lesson.lesson_text?.replace(/"/g, '""') || ''}"`,
            lesson.category || '',
            lesson.impact_score || '',
            lesson.actionability_score || '',
            `"${insight?.personalized_text?.replace(/"/g, '""') || ''}"`,
            `"${actionItems.replace(/"/g, '""')}"`,
            insight?.relevance_score || '',
            episode.url || ''
          ]);
        });
      });

      const csv = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const filename = `founder-lessons-${episodeId ? 'episode' : 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
      
      await handleExport(blob, filename, 'text/csv');
    } catch (error) {
      toast({ title: "Export failed", description: "Please try again", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportMarkdown = async () => {
    setExporting(true);
    try {
      const data = episodeId ? [await fetchEpisodeData(episodeId)] : await fetchAllData();
      
      let markdown = '# Founder Mode Advice\n\n';
      
      data?.forEach((episode: any) => {
        markdown += `## ${episode.title}\n\n`;
        markdown += `**Company:** ${episode.companies?.name || 'N/A'}\n\n`;
        markdown += `**Founders:** ${episode.founder_names || 'N/A'}\n\n`;
        markdown += `**Release Date:** ${episode.release_date || 'N/A'}\n\n`;
        markdown += `**URL:** ${episode.url}\n\n`;
        
        if (episode.lessons?.length > 0) {
          markdown += `### Lessons\n\n`;
          episode.lessons.forEach((lesson: any, idx: number) => {
            markdown += `${idx + 1}. **${lesson.lesson_text}**\n`;
            markdown += `   - Category: ${lesson.category || 'N/A'}\n`;
            markdown += `   - Impact: ${lesson.impact_score}/10\n`;
            markdown += `   - Actionability: ${lesson.actionability_score}/10\n`;
            
            const insight = lesson.personalized_insights?.[0];
            if (insight) {
              markdown += `\n   **💡 Personalized for Your Startup:**\n`;
              markdown += `   ${insight.personalized_text}\n`;
              
              if (insight.action_items && Array.isArray(insight.action_items)) {
                markdown += `\n   **✅ Action Items:**\n`;
                insight.action_items.forEach((item: string, i: number) => {
                  markdown += `   ${i + 1}. ${item}\n`;
                });
              }
              
              if (insight.relevance_score) {
                markdown += `\n   *Relevance: ${insight.relevance_score}/10*\n`;
              }
            }
            markdown += `\n`;
          });
        }
        
        markdown += '---\n\n';
      });

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const filename = `founder-lessons-${episodeId ? 'episode' : 'all'}-${new Date().toISOString().split('T')[0]}.md`;
      
      await handleExport(blob, filename, 'text/markdown');
    } catch (error) {
      toast({ title: "Export failed", description: "Please try again", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const data = episodeId ? [await fetchEpisodeData(episodeId)] : await fetchAllData();
      const doc = new jsPDF();
      let y = 20;

      // Title
      doc.setFontSize(22);
      doc.setTextColor(33, 33, 33);
      doc.text("Executive Summary: Founder Mode Advice", 14, y);
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, y);
      y += 15;

      data?.forEach((episode: any, eIdx: number) => {
        if (y > 250) { doc.addPage(); y = 20; }

        // Episode Header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 33, 33);
        doc.text(episode.title || "Untitled", 14, y, { maxWidth: 180 });
        y += 7;

        // Meta Info
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        const meta = [
          `Company: ${episode.companies?.name || "N/A"}`,
          `Founders: ${episode.founder_names || "N/A"}`,
          `Date: ${episode.release_date || "N/A"}`,
        ].join("  |  ");
        doc.text(meta, 14, y, { maxWidth: 180 });
        y += 8;

        if (episode.lessons?.length > 0) {
          const tableData = episode.lessons.map((lesson: any) => {
            const insight = lesson.personalized_insights?.[0];
            const actionItems = insight?.action_items && Array.isArray(insight.action_items)
                ? insight.action_items.map((i: string) => `• ${i}`).join('\n')
                : "";

            return [
              lesson.lesson_text || "",
              `${lesson.impact_score || "-"}/10`,
              `${lesson.actionability_score || "-"}/10`,
              insight?.personalized_text || "",
              actionItems
            ];
          });

          autoTable(doc, {
            startY: y,
            head: [["Lesson", "Imp", "Act", "Insight", "Action Items"]],
            body: tableData,
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 45 },
              1: { cellWidth: 10 },
              2: { cellWidth: 10 },
              3: { cellWidth: 60 },
              4: { cellWidth: 55 },
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                // Footer or something if needed
            }
          });

          y = (doc as any).lastAutoTable.finalY + 15;
        } else {
            y += 5;
        }
      });

      const blob = doc.output('blob');
      const filename = `executive-summary-${episodeId ? "episode" : "all"}-${new Date().toISOString().split("T")[0]}.pdf`;

      await handleExport(blob, filename, 'application/pdf');
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Export failed", description: "Please try again", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Executive Summary</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          <Button onClick={exportPDF} disabled={exporting} variant="default" className="w-full justify-start">
            <FileDown className="w-4 h-4 mr-2" />
            Download Executive Summary (PDF)
          </Button>
          <div className="relative py-2">
             <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
             <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or export raw data</span></div>
          </div>
          <Button onClick={exportCSV} disabled={exporting} variant="outline" className="w-full justify-start">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export as CSV
          </Button>
          <Button onClick={exportJSON} disabled={exporting} variant="outline" className="w-full justify-start">
            <FileJson className="w-4 h-4 mr-2" />
            Export as JSON
          </Button>
          <Button onClick={exportMarkdown} disabled={exporting} variant="outline" className="w-full justify-start">
            <FileText className="w-4 h-4 mr-2" />
            Export as Markdown
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
