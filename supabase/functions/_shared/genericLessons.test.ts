import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  companyNameVariants,
  mentionsViewerCompany,
  sanitizeLessonText,
} from "./genericLessons.ts";

Deno.test("companyNameVariants — camelCase and legal suffixes", () => {
  const variants = companyNameVariants("ChravelApp Inc");
  assertEquals(variants.includes("ChravelApp Inc"), true);
  assertEquals(variants.includes("ChravelAppInc"), true);
  assertEquals(variants.includes("Chravel App Inc"), true);
});

Deno.test("mentionsViewerCompany — catches For Company, mid-sentence, and camelCase", () => {
  assertEquals(
    mentionsViewerCompany(
      "For ChravelApp, focus on identifying untapped channels for growth.",
      "ChravelApp",
    ),
    true,
  );
  assertEquals(
    mentionsViewerCompany("Apply this to ChravelApp's AI concierge later.", "ChravelApp"),
    true,
  );
  assertEquals(
    mentionsViewerCompany("Look for unused distribution channels.", "ChravelApp"),
    false,
  );
});

Deno.test("sanitizeLessonText — strips viewer company without inventing new advice", () => {
  const sanitized = sanitizeLessonText(
    "For ChravelApp, focus on identifying untapped or underutilized channels for growth.",
    "ChravelApp",
  );
  assertEquals(sanitized.includes("ChravelApp"), false);
  assertEquals(sanitized.startsWith("For "), false);
});
