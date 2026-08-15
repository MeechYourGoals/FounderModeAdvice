#!/usr/bin/env python3
"""QA gate for App Store icons + production screenshots.

Checks:
  * 16 production screenshots exist at exact Apple dimensions, opaque RGB PNGs.
  * Headlines are unique per frame and every frame sources an approved raw capture.
  * Every shipping icon surface has the expected dimensions, RGB mode, and no
    transparency.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PROD = ROOT / "app-store-assets" / "screenshots" / "production"
RAW = ROOT / "app-store-assets" / "screenshots" / "raw"

EXPECTED_DIMS = {"iphone-6.9": (1320, 2868), "ipad-13": (2064, 2752)}

ICONS = {
    "app-store-assets/icon-1024.png": 1024,
    "app-store-assets/brand/icon-1024.png": 1024,
    "app-store-assets/brand/master-appicon-1024.png": 1024,
    "app-store-assets/ios/AppIcon-1024.png": 1024,
    "app-store-assets/android/play-store-512.png": 512,
    "app-store-assets/android/ic_launcher-192.png": 192,
    "app-store-assets/android/ic_launcher-144.png": 144,
    "app-store-assets/android/ic_launcher-96.png": 96,
    "app-store-assets/android/ic_launcher-72.png": 72,
    "app-store-assets/android/ic_launcher-48.png": 48,
    "app-store-assets/android/adaptive-foreground-432.png": 432,
    "app-store-assets/android/adaptive-background-432.png": 432,
    "native/assets/icon.png": 1024,
    "native/assets/splash-icon.png": 512,
    "native/assets/favicon.png": 96,
    "native/assets/adaptive-icon.png": 432,
    "public/apple-touch-icon.png": 180,
    "public/pwa-512x512.png": 512,
    "public/pwa-192x192.png": 192,
    "public/favicon-96x96.png": 96,
    "public/favicon-32x32.png": 32,
    "public/favicon-16x16.png": 16,
    "public/favicon.png": 64,
}


def fail(problems: list[str], msg: str) -> None:
    problems.append(msg)


def check_screenshots(problems: list[str]) -> int:
    manifest_path = PROD / "MANIFEST.json"
    if not manifest_path.exists():
        fail(problems, "MANIFEST.json missing")
        return 0
    manifest = json.loads(manifest_path.read_text())
    if len(manifest) != 16:
        fail(problems, f"expected 16 manifest rows, got {len(manifest)}")

    pngs = sorted(p.name for p in PROD.glob("*.png"))
    if len(pngs) != 16:
        fail(problems, f"expected 16 production PNGs, found {len(pngs)}: {pngs}")

    per_device_headlines: dict[str, set[str]] = {}
    for row in manifest:
        path = PROD / row["filename"]
        if not path.exists():
            fail(problems, f"{row['filename']} listed in manifest but missing on disk")
            continue
        im = Image.open(path)
        expected = EXPECTED_DIMS[row["device"]]
        if im.size != expected:
            fail(problems, f"{row['filename']} is {im.size}, expected {expected}")
        if im.mode != "RGB":
            fail(problems, f"{row['filename']} mode is {im.mode}, expected RGB")
        if "transparency" in im.info or im.mode in ("RGBA", "LA", "P"):
            fail(problems, f"{row['filename']} carries transparency")
        if f"{im.size[0]}x{im.size[1]}" != row["dimensions"]:
            fail(problems, f"{row['filename']} manifest dimensions mismatch")

        src = ROOT / row["source_capture"]
        if src.parent != RAW or not src.exists():
            fail(problems, f"{row['filename']} sources non-approved capture {row['source_capture']}")

        if not row.get("support"):
            fail(problems, f"{row['filename']} has no supporting line")

        seen = per_device_headlines.setdefault(row["device"], set())
        if row["headline"] in seen:
            fail(problems, f"duplicate headline on {row['device']}: {row['headline']}")
        seen.add(row["headline"])

    for device, headlines in per_device_headlines.items():
        if len(headlines) != 8:
            fail(problems, f"{device} has {len(headlines)} unique headlines, expected 8")

    return len(manifest)


def check_icons(problems: list[str]) -> int:
    for rel, size in ICONS.items():
        path = ROOT / rel
        if not path.exists():
            fail(problems, f"icon missing: {rel}")
            continue
        im = Image.open(path)
        if im.size != (size, size):
            fail(problems, f"{rel} is {im.size}, expected {(size, size)}")
        if im.mode != "RGB":
            fail(problems, f"{rel} mode is {im.mode}, expected RGB (no alpha)")
        if "transparency" in im.info:
            fail(problems, f"{rel} declares transparency")
    ico = ROOT / "public" / "favicon.ico"
    if not ico.exists():
        fail(problems, "public/favicon.ico missing")
    return len(ICONS)


def main() -> None:
    problems: list[str] = []
    shots = check_screenshots(problems)
    icons = check_icons(problems)
    print(f"screenshots checked: {shots}")
    print(f"icon surfaces checked: {icons}")
    if problems:
        print("\nFAILED:")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)
    print("\nAll App Store asset checks passed.")


if __name__ == "__main__":
    main()
