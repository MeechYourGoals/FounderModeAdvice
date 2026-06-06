// Curated, widely-known public talks used to guide a brand-new user's first
// analysis. They're broadly useful across business types; the actual output is
// personalized by the user's selected business profile, so we keep one strong
// default set rather than guessing fragile per-industry links.

export interface StarterVideo {
  title: string;
  source: string;
  url: string;
}

export const STARTER_VIDEOS: StarterVideo[] = [
  {
    title: "How great leaders inspire action",
    source: "Simon Sinek · TED",
    url: "https://youtube.com/watch?v=qp0HIF3SfI4",
  },
  {
    title: "Stanford Commencement Address",
    source: "Steve Jobs",
    url: "https://youtube.com/watch?v=UF8uR6Z6KLc",
  },
  {
    title: "How to Start a Startup (Lecture 1)",
    source: "Sam Altman · Y Combinator",
    url: "https://youtube.com/watch?v=CBYhVcO4WgI",
  },
  {
    title: "Your body language may shape who you are",
    source: "Amy Cuddy · TED",
    url: "https://youtube.com/watch?v=Ks-_Mh1QhMc",
  },
];
