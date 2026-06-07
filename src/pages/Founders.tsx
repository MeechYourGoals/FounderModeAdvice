import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { SpeakerDirectory } from "@/components/SpeakerDirectory";

export default function Founders() {
  const navigate = useNavigate();

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
               Speakers
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
           <SpeakerDirectory variant="grid" />
         </div>
       </div>
       <MobileBottomNav />
    </div>
  );
}
