import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";

export const inter = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
export const interFamily = inter.fontFamily;

export const fraunces = loadFraunces("italic", { weights: ["400", "500"], subsets: ["latin"] });
export const frauncesFamily = fraunces.fontFamily;

export const colors = {
  bg0: "#05070C",
  bg1: "#0B1220",
  card: "#0F1626",
  border: "rgba(255,255,255,0.10)",
  text: "rgba(255,255,255,0.96)",
  textMuted: "rgba(255,255,255,0.72)",
  primary: "hsl(142, 76%, 46%)",
  primaryDeep: "hsl(160, 84%, 30%)",
  primaryGlow: "rgba(34, 197, 94, 0.35)",
};
