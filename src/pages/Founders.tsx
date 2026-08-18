import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft } from "lucide-react";
import { AppNavMenu } from "@/components/AppNavMenu";
import { Button } from "@/components/ui/button";
import { SpeakerDirectory } from "@/components/SpeakerDirectory";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Founders() {
  usePageMeta({ title: "Founder Directory", description: "Browse founders, investors, and operators whose talks founders analyze most.", path: "/founders" });

  const navigate = useNavigate();

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-background to-muted/20">
       {/* Top bar with safe area (Despia pattern) */}
       <div className="glass-nav relative z-50 border-b border-border" style={{ paddingTop: 'var(--safe-area-top)' }}>
         <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
           <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="md:hidden">
               <ArrowLeft className="w-5 h-5" />
             </Button>
             <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
               <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                 <Users className="w-5 h-5 sm:w-6 sm:h-6" />
               </span>
               Speakers
             </h1>
           </div>
           <div className="flex gap-2">
             <Button variant="outline" onClick={() => navigate('/')} className="hidden md:flex">Back</Button>
             <AppNavMenu triggerVariant="outline" />
           </div>
         </div>
       </div>

       {/* Scrollable content (Despia pattern) */}
       <div className="despia-scroll" style={{ paddingBottom: 'calc(5rem + var(--safe-area-bottom))' }}>
         <div className="container mx-auto px-4 py-8 max-w-6xl">
           <SpeakerDirectory variant="grid" />
         </div>
       </div>
    </div>
  );
}
