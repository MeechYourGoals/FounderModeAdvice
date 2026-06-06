const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

export const extractYouTubeVideoId = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === "youtu.be") {
      return parsedUrl.pathname.slice(1).split("/")[0] || "";
    }
    if (parsedUrl.pathname.startsWith("/shorts/")) {
      return parsedUrl.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    }
    if (parsedUrl.hostname.includes("youtube.com")) {
      return parsedUrl.searchParams.get("v") || "";
    }
    return "";
  } catch {
    return "";
  }
};

export const isYouTubeUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.includes("youtube.com") || parsedUrl.hostname === "youtu.be";
  } catch {
    return false;
  }
};

export const extractYouTubeTranscript = async (videoId: string) => {
  if (!videoId) return null;

  try {
    const watchResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "Accept-Language": "en-US,en;q=0.9" },
    });

    if (!watchResponse.ok) return null;

    const watchHtml = await watchResponse.text();
    const playerMatch = watchHtml.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (!playerMatch?.[1]) return null;

    const playerResponse = JSON.parse(playerMatch[1]);
    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    const preferredTrack =
      tracks.find((track: any) => track.languageCode?.toLowerCase().startsWith("en")) || tracks[0];

    const transcriptUrl = preferredTrack.baseUrl;
    if (!transcriptUrl) return null;

    const transcriptResponse = await fetch(`${transcriptUrl}&fmt=json3`);
    if (!transcriptResponse.ok) return null;

    const rawTranscript = await transcriptResponse.text();
    let transcriptText = "";

    try {
      const json = JSON.parse(rawTranscript);
      transcriptText = (json.events || [])
        .flatMap((event: any) => event.segs || [])
        .map((segment: any) => segment.utf8 || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    } catch {
      transcriptText = rawTranscript
        .replace(/<text[^>]*>/g, " ")
        .replace(/<\/text>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      transcriptText = decodeHtml(transcriptText);
    }

    if (!transcriptText || transcriptText.length < 200) return null;

    return {
      transcriptText,
      language: preferredTrack.languageCode || null,
      source: preferredTrack.kind === "asr" ? "youtube_auto_captions" : "youtube_captions",
    };
  } catch (error) {
    console.warn("Could not extract YouTube transcript:", error);
    return null;
  }
};
