import { supabase } from "@/integrations/supabase/client";
import despia from "despia-native";

export type SaveResult = "downloaded" | "shared";

/**
 * Persist a generated file for the user.
 * - On the Despia native runtime: upload to the private `exports` bucket and
 *   open the native share sheet via a short-lived signed URL.
 * - On web: trigger a standard browser download.
 *
 * Throws on failure; callers handle user-facing toasts.
 */
export async function saveOrShareBlob(
  blob: Blob,
  filename: string,
  mimeType: string,
  isDespia: boolean,
): Promise<SaveResult> {
  if (isDespia) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const path = `${user.id}/${Date.now()}-${filename}`;
    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(path, blob, { contentType: mimeType, upsert: true });
    if (uploadError) throw uploadError;

    const { data } = await supabase.storage
      .from("exports")
      .createSignedUrl(path, 3600, { download: filename });
    if (!data?.signedUrl) throw new Error("Failed to generate signed URL");

    despia(data.signedUrl);
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
