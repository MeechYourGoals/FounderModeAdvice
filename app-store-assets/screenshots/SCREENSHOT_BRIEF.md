# App Store Screenshot Brief — Founder Mode Advice

Generated for production compositing. Source UI is captured from
`/__screenshots/:frame` using rights-cleared `SAMPLE_*` demo data
(`src/lib/sampleDemoData.ts`).

## Verified feature sequence

| # | Frame id | Headline | Supporting line | Source surface |
|---|---|---|---|---|
| 1 | `action` | Turn great advice into action | Operating memos tailored to your company. | Completed operating memo / next-move view |
| 2 | `operating-memo` | Any source becomes an operating memo | Paste a link. Get decision-ready structure. | New analysis / source URL input |
| 3 | `source-grounded` | Ground every insight in the source | Transcript-anchored lessons you can verify. | Source vs company-specific lesson |
| 4 | `lessons-risks-actions` | See lessons, risks, and next moves | Organized for the decision in front of you. | Top lessons + risks/next moves |
| 5 | `follow-up-qa` | Ask follow-ups for your company | Company-specific Q&A against the memo. | Ask-the-video chat |
| 6 | `library` | Build your founder intelligence library | Profiles, folders, and compounding insight. | Saved library + folders |
| 7 | `search` | Find the right insight instantly | Search and filter your saved playbook. | Search / topic facets |
| 8 | `save-share` | Save and share what matters | Export the memo. Keep the team aligned. | Export executive summary + share |

## Sizes

- iPhone 6.9": `1320 × 2868` portrait
- iPad 13": `2064 × 2752` portrait

## Brand system

- Cream paper background, black editorial headlines, bright-red accent rule/logo
- Display: DM Serif Display / Fraunces
- UI body: system / Inter
- Logo sparingly on slides 01 and 08
- No pricing, awards, fake ratings, or third-party logos

## Regeneration

```bash
npm run dev -- --host 0.0.0.0 --port 8080
node scripts/capture-app-store-frames.mjs
python3 scripts/compose-app-store-screenshots.py
```

Outputs land in `app-store-assets/screenshots/production/`.
