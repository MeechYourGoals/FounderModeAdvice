import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

interface FounderStats {
  name: string;
  episodeCount: number;
  companyName: string;
  industry: string | null;
}

export default function Founders() {
  const [founders, setFounders] = useState<FounderStats[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFounders = async () => {
      try {
        const { data: episodes, error } = await supabase
          .from('episodes')
          .select('founder_names, companies(name, industry)');

        if (error) throw error;

        const statsMap = new Map<string, FounderStats>();

        episodes?.forEach((ep: any) => {
          if (!ep.founder_names) return;

          // Split comma separated names if any
          const names = ep.founder_names.split(',').map((n: string) => n.trim());

          names.forEach((name: string) => {
            if (!statsMap.has(name)) {
              statsMap.set(name, {
                name,
                episodeCount: 0,
                companyName: ep.companies?.name || 'Unknown',
                industry: ep.companies?.industry || null
              });
            }
            const stats = statsMap.get(name)!;
            stats.episodeCount++;
            // Update company if unknown previously
            if (stats.companyName === 'Unknown' && ep.companies?.name) {
                stats.companyName = ep.companies.name;
                stats.industry = ep.companies.industry;
            }
          });
        });

        setFounders(Array.from(statsMap.values()).sort((a, b) => b.episodeCount - a.episodeCount));
      } catch (error) {
        console.error("Error fetching founders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFounders();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
       {/* Top bar with safe area (Despia pattern) */}
       <div className="glass-nav relative z-50 border-b border-border" style={{ paddingTop: 'var(--safe-area-top)' }}>
         <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
           <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="md:hidden">
               <ArrowLeft className="w-5 h-5" />
             </Button>
             <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
               <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
               Founders
             </h1>
           </div>
           <div className="flex gap-2">
             <Button variant="outline" onClick={() => navigate('/')} className="hidden md:flex">Back to Dashboard</Button>
             <ThemeToggle />
           </div>
         </div>
       </div>

       {/* Scrollable content (Despia pattern) */}
       <div className="despia-scroll" style={{ paddingBottom: 'calc(5rem + var(--safe-area-bottom))' }}>
         <div className="container mx-auto px-4 py-8 max-w-6xl">
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {founders.map((founder) => (
               <Card
                 key={founder.name}
                 className="glass elevate-hover rounded-2xl p-4 cursor-pointer border-l-4 border-l-primary"
                 onClick={() => navigate(`/?founder=${encodeURIComponent(founder.name)}`)}
               >
                 <h3 className="font-bold text-lg mb-1 truncate" title={founder.name}>{founder.name}</h3>
                 <p className="text-sm text-muted-foreground mb-3 truncate" title={founder.companyName}>{founder.companyName}</p>
                 <div className="flex flex-wrap gap-2">
                   <Badge variant="secondary" className="text-xs">
                     {founder.episodeCount} Episode{founder.episodeCount !== 1 ? 's' : ''}
                   </Badge>
                   {founder.industry && (
                     <Badge variant="outline" className="text-xs truncate max-w-[150px]">
                       {founder.industry}
                     </Badge>
                   )}
                 </div>
               </Card>
             ))}
           </div>

           {founders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No founders found. Start by analyzing episodes!
              </div>
           )}
         </div>
       </div>
       <MobileBottomNav />
    </div>
  );
}
