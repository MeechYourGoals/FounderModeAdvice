// Client-side analysis source classification. Runs under the same Deno test
// task as the other src/lib helpers (see deno.json).
import assert from "node:assert/strict";
import {
  getAnalysisSourceActionLabel,
  getAnalysisSourceKind,
  getAnalysisSourceLabel,
  isUploadedDocumentUrl,
} from "@/lib/analysisSource.ts";

Deno.test("YouTube and other video hosts classify as video", () => {
  assert.equal(getAnalysisSourceKind("https://youtube.com/watch?v=UF8uR6Z6KLc"), "video");
  assert.equal(getAnalysisSourceKind("https://www.youtube.com/watch?v=abc"), "video");
  assert.equal(getAnalysisSourceKind("https://youtu.be/abc123"), "video");
  assert.equal(getAnalysisSourceKind("https://www.tiktok.com/@user/video/1"), "video");
  assert.equal(getAnalysisSourceKind("https://www.instagram.com/reel/xyz"), "video");
  assert.equal(getAnalysisSourceKind("https://vimeo.com/12345"), "video");
});

Deno.test("public blog and article URLs classify as article", () => {
  assert.equal(getAnalysisSourceKind("https://a16z.com/building-in-stealth/"), "article");
  assert.equal(getAnalysisSourceKind("https://www.linkedin.com/pulse/some-essay"), "article");
});

Deno.test("podcast hosts and audio files classify as podcast", () => {
  assert.equal(getAnalysisSourceKind("https://podcasts.apple.com/us/podcast/id1"), "podcast");
  assert.equal(getAnalysisSourceKind("https://open.spotify.com/episode/abc"), "podcast");
  assert.equal(getAnalysisSourceKind("https://overcast.fm/+abc"), "podcast");
  assert.equal(getAnalysisSourceKind("https://cdn.example.com/talk.mp3"), "podcast");
});

Deno.test("uploaded PDFs classify as pdf", () => {
  assert.equal(getAnalysisSourceKind("document://deck.pdf"), "pdf");
  assert.equal(getAnalysisSourceKind("document://My%20Pitch%20Deck.pdf"), "pdf");
});

Deno.test("uploaded images classify as screenshot", () => {
  assert.equal(getAnalysisSourceKind("document://note.png"), "screenshot");
  assert.equal(getAnalysisSourceKind("document://capture.JPG"), "screenshot");
  assert.equal(getAnalysisSourceKind("document://shot.webp"), "screenshot");
});

Deno.test("other uploaded files classify as document", () => {
  assert.equal(getAnalysisSourceKind("document://notes.docx"), "document");
  assert.equal(getAnalysisSourceKind("document://memo.txt"), "document");
  assert.equal(getAnalysisSourceKind("document://sheet.xlsx"), "document");
});

Deno.test("labels and action copy match the source kind", () => {
  assert.equal(getAnalysisSourceLabel("video"), "Video");
  assert.equal(getAnalysisSourceLabel("article"), "Article");
  assert.equal(getAnalysisSourceLabel("podcast"), "Podcast");
  assert.equal(getAnalysisSourceLabel("pdf"), "PDF");
  assert.equal(getAnalysisSourceLabel("screenshot"), "Screenshot");
  assert.equal(getAnalysisSourceLabel("document"), "Document");
  assert.equal(getAnalysisSourceActionLabel("video"), "Watch Now");
  assert.equal(getAnalysisSourceActionLabel("article"), "Read Now");
  assert.equal(getAnalysisSourceActionLabel("podcast"), "Listen Now");
  assert.equal(getAnalysisSourceActionLabel("pdf"), "View Details");
});

Deno.test("uploaded document URLs are detected from the document:// prefix", () => {
  assert.equal(isUploadedDocumentUrl("document://deck.pdf"), true);
  assert.equal(isUploadedDocumentUrl("https://youtube.com/watch?v=1"), false);
});
