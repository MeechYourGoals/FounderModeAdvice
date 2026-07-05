/** Extract plain text from uploaded source files (PDF, TXT, MD). */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".txt", ".md", ".markdown", ".csv"]);

export function isSupportedSourceUpload(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.has(lower.slice(lower.lastIndexOf(".")));
}

export async function extractTextFromUpload(
  buffer: ArrayBuffer,
  filename: string,
  lovableApiKey: string,
): Promise<{ text: string; source: string }> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".csv")) {
    const text = new TextDecoder().decode(buffer).replace(/\s+/g, " ").trim();
    if (text.length < 100) throw new Error("Uploaded file has too little text to analyze.");
    return { text: text.slice(0, 120000), source: "upload_text" };
  }

  if (lower.endsWith(".pdf")) {
    const base64Pdf = arrayBufferToBase64(buffer);
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`;
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Extract the full readable text from this document. Return only the extracted text — no commentary.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all readable text from this document for downstream analysis." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!aiResponse.ok) {
      throw new Error("Could not read this PDF. Try a text-based PDF or paste the content as a .txt file.");
    }
    const aiResult = await aiResponse.json();
    const text = (aiResult.choices?.[0]?.message?.content || "").replace(/\s+/g, " ").trim();
    if (text.length < 100) {
      throw new Error("Could not extract enough text from this PDF. Try a .txt export or paste the content.");
    }
    return { text: text.slice(0, 120000), source: "upload_pdf" };
  }

  throw new Error("Unsupported file type. Supported uploads: PDF, TXT, MD, CSV.");
}
