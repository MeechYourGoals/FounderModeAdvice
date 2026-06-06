SCOPE_DEFINITION:

Primary Objective: Remove the sparkle icon and other obvious "vibe coding" design tells from the marketing landing page and hero section.

Success Criteria:
- No Sparkles icon in the nav or anywhere in the app
- No "AI-Powered" buzzword copy on feature cards
- No gradient text effect (bg-clip-text transparent) on hero headings
- No fake/placeholder statistics (500+, 2000+, 100+)
- All "Founder Lessons" references updated to "Founder Mode Advice"

Affected Systems:
- src/components/PublicLanding.tsx — nav sparkle icon, hero gradient text, fake stats, outdated brand name
- src/components/HeroSection.tsx — hero gradient text, "AI-Powered Analysis" copy

Risk Assessment: Low — purely cosmetic copy and icon swaps, no functional logic touched.

Alternative Approaches:
A) Swap Sparkles for a more serious icon (Lightbulb, Compass, etc.) — rejected, user said "get rid of"
B) Keep gradient text but remove sparkle only — rejected, gradient text is a classic vibe-coding tell
C) Full landing page rewrite — rejected, out of scope, user asked for surgical removal of tells only
D) Keep stats but add disclaimers — rejected, fake stats are a tell; better to remove or replace with honest copy
E) This plan — remove sparkle, remove gradient text, fix buzzwords, fix fake stats, fix brand name. Accepted.

---

## Technical Details

### Changes to PublicLanding.tsx
1. Remove `Sparkles` from lucide-react import and nav logo usage
2. Replace the logo icon area with a simple text mark or remove the icon entirely
3. Change hero `h1` class from `bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent` to plain `text-foreground`
4. Remove or replace the fake statistics section ("500+ Expert videos", "2,000+ Transcript-grounded lessons", "100+ Public experts")
5. Update remaining "Founder Lessons" → "Founder Mode Advice" (2 occurrences in body copy)

### Changes to HeroSection.tsx
1. Change hero `h1` class from gradient text to plain `text-foreground`
2. Change feature card title from "AI-Powered Analysis" to something substantive like "Structured Extraction"
3. Optionally clean up `elevate-hover` class if it maps to a generic AI-generated hover effect

### Files Modified
- src/components/PublicLanding.tsx
- src/components/HeroSection.tsx