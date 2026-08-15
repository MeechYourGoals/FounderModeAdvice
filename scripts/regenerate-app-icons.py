#!/usr/bin/env python3
"""Derive every shipping icon surface from the approved 1024 master mark.

Master: app-store-assets/brand/master-appicon-1024.png (RGB, opaque).

Rules enforced here:
  * No stretching — the master is square and only ever downscaled with LANCZOS.
  * Apple / web / Play icons are written as opaque RGB (no alpha channel).
  * The only alpha-bearing output is the Android adaptive FOREGROUND, which the
    platform requires; its mark is kept inside the 66% safe zone and paired with
    a matching navy background plate sampled from the master.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "app-store-assets" / "brand" / "master-appicon-1024.png"

# Opaque square outputs: path -> size
OPAQUE_TARGETS: dict[str, int] = {
    "app-store-assets/icon-1024.png": 1024,
    "app-store-assets/brand/icon-1024.png": 1024,
    "app-store-assets/ios/AppIcon-1024.png": 1024,
    "app-store-assets/android/play-store-512.png": 512,
    "app-store-assets/android/ic_launcher-192.png": 192,
    "app-store-assets/android/ic_launcher-144.png": 144,
    "app-store-assets/android/ic_launcher-96.png": 96,
    "app-store-assets/android/ic_launcher-72.png": 72,
    "app-store-assets/android/ic_launcher-48.png": 48,
    "native/assets/icon.png": 1024,
    "native/assets/splash-icon.png": 512,
    "native/assets/favicon.png": 96,
    "public/apple-touch-icon.png": 180,
    "public/pwa-512x512.png": 512,
    "public/pwa-192x192.png": 192,
    "public/favicon-96x96.png": 96,
    "public/favicon-32x32.png": 32,
    "public/favicon-16x16.png": 16,
    "public/favicon.png": 64,
}

ADAPTIVE_SIZE = 432
# Android adaptive icons: the outer ~25% can be masked away, so the mark is
# rendered at 66% of the canvas and centered.
ADAPTIVE_SAFE_RATIO = 0.66
ADAPTIVE_TARGETS = [
    "app-store-assets/android/adaptive-foreground-432.png",
    "app-store-assets/android/adaptive-background-432.png",
    "native/assets/adaptive-icon.png",
]


def load_master() -> Image.Image:
    im = Image.open(MASTER)
    if im.size != (1024, 1024):
        raise SystemExit(f"master must be 1024x1024, got {im.size}")
    return im.convert("RGB")


def navy(master: Image.Image) -> tuple[int, int, int]:
    """Background navy sampled from the master's flat corner region."""
    patch = master.crop((0, 0, 40, 40)).resize((1, 1), Image.Resampling.BOX)
    return patch.getpixel((0, 0))


def square(master: Image.Image, size: int) -> Image.Image:
    if size > master.width:
        raise SystemExit(f"refusing to upscale master to {size}px")
    return master.resize((size, size), Image.Resampling.LANCZOS)


def write_opaque(master: Image.Image) -> list[tuple[str, str]]:
    rows = []
    for rel, size in OPAQUE_TARGETS.items():
        out = ROOT / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        img = square(master, size)
        img.save(out, format="PNG", optimize=True)
        rows.append((rel, f"{size}x{size} RGB"))
    return rows


def write_ico(master: Image.Image) -> tuple[str, str]:
    out = ROOT / "public" / "favicon.ico"
    base = square(master, 64)
    base.save(out, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    return ("public/favicon.ico", "16/32/48/64 ICO")


def write_adaptive(master: Image.Image) -> list[tuple[str, str]]:
    bg_color = navy(master)
    inner = int(ADAPTIVE_SIZE * ADAPTIVE_SAFE_RATIO)
    mark = square(master, inner)
    off = (ADAPTIVE_SIZE - inner) // 2

    # Foreground is a full-bleed navy plate with the mark inside the 66% safe
    # zone. Baking the plate in keeps it opaque (no alpha anywhere in the
    # shipping icon set) and removes any seam against the background plate.
    foreground = Image.new("RGB", (ADAPTIVE_SIZE, ADAPTIVE_SIZE), bg_color)
    foreground.paste(mark, (off, off))
    background = Image.new("RGB", (ADAPTIVE_SIZE, ADAPTIVE_SIZE), bg_color)

    rows = []
    for rel, img, note in (
        ("app-store-assets/android/adaptive-foreground-432.png", foreground, "mark in 66% safe zone"),
        ("app-store-assets/android/adaptive-background-432.png", background, "navy plate"),
        ("native/assets/adaptive-icon.png", foreground, "mark in 66% safe zone"),
    ):
        img.save(ROOT / rel, format="PNG", optimize=True)
        hexcolor = "#%02x%02x%02x" % bg_color
        rows.append((rel, f"{ADAPTIVE_SIZE}x{ADAPTIVE_SIZE} RGB {hexcolor} — {note}"))

    return rows



def main() -> None:
    master = load_master()
    rows = write_opaque(master)
    rows.append(write_ico(master))
    rows.extend(write_adaptive(master))
    print(f"navy background sampled from master: #%02x%02x%02x" % navy(master))
    for rel, note in rows:
        print(f"  {rel:<58} {note}")
    print(f"{len(rows)} icon surfaces regenerated from {MASTER.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
