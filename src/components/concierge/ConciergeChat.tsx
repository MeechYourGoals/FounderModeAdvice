import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./MessageBubble";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { ConciergeMessage } from "@/types/concierge";
import { triggerHapticFeedback } from "@/lib/capacitor";

// Demo messages to show the component working correctly
const DEMO_MESSAGES: ConciergeMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: `This plan is shaping up to be a spectacular journey. Based on a departure around **May 24th, 2026**, for a 14-day total trip (12 days on the ground), here are the refined flight and luxury hotel options for your group.

### 1. Flights: Atlanta (ATL) to Tokyo (HND/NRT)

For Premium Economy, **Delta** and **Japan Airlines (JAL)** are your best bets for comfort and service.

- **Departure:** May 24, 2026
- **Return:** June 7, 2026
- **Estimated Price:** $2,900 – $3,800 per person for Premium Economy.

### 2. Tokyo Luxury Hotels

Since you'll likely start and end in Tokyo, these properties offer the pinnacle of Japanese hospitality and design.

**Aman Tokyo** – Occupying the top six floors of the Otemachi Tower, this hotel blends traditional Japanese design with modern minimalism. The lobby features a massive "shoji lantern" ceiling.

**Mandarin Oriental, Tokyo** – Located in the historic Nihonbashi district, it offers incredible views of the city and Mt. Fuji on clear days.

### 4. 14-Day Itinerary (May 24 – June 7)

- **Day 1 (May 24):** Depart Atlanta (ATL) on a Premium Economy flight.
- **Day 2 (May 25):** Arrive in Tokyo. Check into your hotel and enjoy a light dinner in Ginza or Shinjuku.
- **Day 3-6: Tokyo Exploration.**
- Private tour of Tsukiji Outer Market.
- TeamLab Borderless digital art experience.
- Evening cocktails at the New York Bar (Park Hyatt) for the *Lost in Translation* vibe.
- **Day 7: Shinkansen to Kyoto.** Take the Green Car (First Class) on the Nozomi Shinkansen for maximum comfort.
- **Day 8-10: Kyoto Immersion.**
- Private tea ceremony in a traditional Machiya.
- Early morning visit to the Arashiyama Bamboo Grove.
- **Day 11: Kyoto to Osaka.** A short 15-minute Shinkansen ride. Check into the **W Osaka** or **Conrad Osaka**.
- **Day 12: Osaka Highlights.**
- Street food tour in Dotonbori.
- Visit Osaka Castle.
- **Day 13: Return to Tokyo.** Take the Shinkansen back for a final night of shopping and a farewell dinner.
- **Day 14 (June 7):** Depart from Tokyo (HND/NRT) back to Atlanta.`,
    timestamp: new Date("2026-03-04T12:03:00"),
    attachments: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
        title: "Tokyo cityscape",
      },
    ],
  },
  {
    id: "2",
    role: "assistant",
    content: `I've saved all five luxury hotel options to your trip's **Places** tab under the **Accommodation** category. You and the group can now view, vote on, and discuss them there.

Here is the list of what was added:

- [Aman Tokyo](https://www.aman.com/hotels/aman-tokyo)
- [Mandarin Oriental, Tokyo](https://www.mandarinoriental.com/tokyo)
- [The Prince Park Tower Tokyo](https://www.princehotels.com/parktower)
- [Park Hyatt Kyoto](https://www.hyatt.com/park-hyatt/kyoto)
- [Hiiragiya Ryokan](https://www.hiiragiya.co.jp/en/)

**Next Steps for Flights:** Since you're looking at a **May 24th departure** from Atlanta, would you like me to create a poll for the group to vote on their preferred flight time or airline (Delta vs. JAL)?`,
    timestamp: new Date("2026-03-04T16:13:00"),
  },
  {
    id: "3",
    role: "user",
    content:
      "awesome, can you actually find and display a few flight options here in the chat that i can checkout before we post a poll? need to fly out of Atlanta preferably an afternoon flight from ATL to Tokyo",
    timestamp: new Date("2026-03-05T12:12:00"),
  },
  {
    id: "4",
    role: "assistant",
    content: `Finding Premium Economy flights from Atlanta (ATL) to Tokyo (HND/NRT) for your dates (**May 24 – June 7**) with an afternoon departure is a great way to handle the long journey.

Most direct flights from Atlanta to Tokyo are operated by **Delta Air Lines** (via their partnership with Korean Air or direct seasonal routes). Here are your best options:

### Option 1: Delta DL295 (Nonstop to HND)
- **Departs:** ATL 2:15 PM → **Arrives:** HND 5:55 PM (+1 day)
- **Duration:** ~14h 40m
- **Aircraft:** Boeing 767-400ER
- **Premium Economy:** ~$3,200 per person round trip

### Option 2: Japan Airlines via Dallas (JL12)
- **Departs:** ATL 1:30 PM (connection DFW) → **Arrives:** NRT 4:10 PM (+1 day)
- **Duration:** ~18h 40m (1 stop)
- **Aircraft:** Boeing 787-9 Dreamliner (DFW-NRT leg)
- **Premium Economy:** ~$2,900 per person round trip

### Option 3: Delta via Seattle (DL167)
- **Departs:** ATL 12:45 PM (connection SEA) → **Arrives:** HND 3:30 PM (+1 day)
- **Duration:** ~19h 45m (1 stop)
- **Aircraft:** Airbus A330-900neo (SEA-HND leg)
- **Premium Economy:** ~$2,750 per person round trip

**My recommendation:** Option 1 (Delta nonstop) is the clear winner for convenience—a direct afternoon flight that gets you to Tokyo in the evening, ready to rest and start Day 2 refreshed.

Want me to create a poll for the group with these three options?`,
    timestamp: new Date("2026-03-05T12:13:00"),
  },
];

export function ConciergeChat() {
  const [messages, setMessages] = useState<ConciergeMessage[]>(DEMO_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    messageId: string | null;
  }>({ open: false, messageId: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    triggerHapticFeedback("light");

    const userMessage: ConciergeMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate assistant response (in production, this would call your AI backend)
    setTimeout(() => {
      const assistantMessage: ConciergeMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I'm looking into that for you. This is a demo response from the Concierge AI. In production, this would be connected to your AI backend.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleDeleteRequest = (messageId: string) => {
    triggerHapticFeedback("light");
    setDeleteConfirm({ open: true, messageId });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.messageId) {
      setMessages((prev) =>
        prev.filter((m) => m.id !== deleteConfirm.messageId),
      );
      triggerHapticFeedback("medium");
    }
    setDeleteConfirm({ open: false, messageId: null });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ open: false, messageId: null });
  };

  const handleSpeak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleStopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Search className="h-5 w-5 text-primary" />
        </Button>
        <h1 className="text-base font-semibold flex items-center gap-2">
          Concierge AI
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground font-normal">
            Chravel Agent
          </span>
        </h1>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Sparkles className="h-5 w-5 text-primary" />
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className="group">
            <MessageBubble
              message={message}
              onDelete={handleDeleteRequest}
              onSpeak={handleSpeak}
              isSpeaking={isSpeaking}
              onStopSpeaking={handleStopSpeaking}
            />
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-card border border-border rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background p-4 safe-bottom">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Concierge AI..."
              rows={1}
              className={cn(
                "w-full resize-none rounded-2xl border border-border bg-muted/30 px-4 py-3 pr-12 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
                "max-h-32 min-h-[48px]",
              )}
              style={{ overflow: "auto" }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-12 w-12 rounded-full shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
