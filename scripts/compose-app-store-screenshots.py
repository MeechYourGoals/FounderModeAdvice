#!/usr/bin/env python3
"""Compose marketing App Store screenshots around locked UI captures."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "app-store-assets" / "screenshots" / "raw"
OUT_DIR = ROOT / "app-store-assets" / "screenshots" / "production"
BRAND_DIR = ROOT / "app-store-assets"
FONTS = ROOT / "scripts" / "fonts"
LOGO_CANDIDATES = [
    BRAND_DIR / "brand" / "fma-logo-light.png",
    Path("/tmp/fma-logo-light.png"),
    BRAND_DIR / "icon-1024.png",
]

# Cream / black / brand-red editorial system
CREAM = (245, 240, 230)
CREAM_DEEP = (232, 224, 210)
INK = (18, 18, 18)
INK_SOFT = (55, 52, 48)
RED = (196, 32, 46)  # approx hsl(356 72% 47%)
RULE = (210, 200, 186)

FRAMES = [
    {
        "id": "action",
        "file": "01-action",
        "headline": "Turn great advice into action",
        "support": "Operating memos tailored to your company.",
        "show_logo": True,
    },
    {
        "id": "operating-memo",
        "file": "02-operating-memo",
        "headline": "Any source becomes an operating memo",
        "support": "Paste a link. Get decision-ready structure.",
        "show_logo": False,
    },
    {
        "id": "source-grounded",
        "file": "03-source-grounded",
        "headline": "Ground every insight in the source",
        "support": "Transcript-anchored lessons you can verify.",
        "show_logo": False,
    },
    {
        "id": "lessons-risks-actions",
        "file": "04-lessons-risks-actions",
        "headline": "See lessons, risks, and next moves",
        "support": "Organized for the decision in front of you.",
        "show_logo": False,
    },
    {
        "id": "follow-up-qa",
        "file": "05-follow-up-qa",
        "headline": "Ask follow-ups for your company",
        "support": "Company-specific Q&A against the memo.",
        "show_logo": False,
    },
    {
        "id": "library",
        "file": "06-library",
        "headline": "Build your founder intelligence library",
        "support": "Profiles, folders, and compounding insight.",
        "show_logo": False,
    },
    {
        "id": "search",
        "file": "07-search",
        "headline": "Find the right insight instantly",
        "support": "Search and filter your saved playbook.",
        "show_logo": False,
    },
    {
        "id": "save-share",
        "file": "08-save-share",
        "headline": "Save and share what matters",
        "support": "Export the memo. Keep the team aligned.",
        "show_logo": True,
    },
]

DEVICES = {
    "iphone": {
        "label": "iphone-6.9",
        "size": (1320, 2868),
        "suffix": "iphone-6.9",
        "ui_top_ratio": 0.195,
        "side_margin": 72,
        "radius": 78,
        "headline_size": 72,
        "support_size": 32,
    },
    "ipad": {
        "label": "ipad-13",
        "size": (2064, 2752),
        "suffix": "ipad-13",
        "ui_top_ratio": 0.165,
        "side_margin": 110,
        "radius": 52,
        "headline_size": 78,
        "support_size": 34,
    },
}


def load_font(path: Path, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError:
        return ImageFont.load_default()


def paper_background(size: tuple[int, int]) -> Image.Image:
    w, h = size
    base = Image.new("RGB", size, CREAM)
    draw = ImageDraw.Draw(base)
    # Soft vertical wash
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(CREAM[0] * (1 - t * 0.04) + CREAM_DEEP[0] * (t * 0.04))
        g = int(CREAM[1] * (1 - t * 0.05) + CREAM_DEEP[1] * (t * 0.05))
        b = int(CREAM[2] * (1 - t * 0.06) + CREAM_DEEP[2] * (t * 0.06))
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    # Subtle grain
    noise = Image.effect_noise((w // 2, h // 2), 18).resize(size, Image.Resampling.BILINEAR)
    noise = ImageOps.grayscale(noise).convert("RGB")
    base = Image.blend(base, noise, 0.035)
    # Soft corner vignette
    vignette = Image.new("L", size, 0)
    vdraw = ImageDraw.Draw(vignette)
    vdraw.ellipse((-w * 0.2, -h * 0.1, w * 1.2, h * 0.85), fill=40)
    vignette = vignette.filter(ImageFilter.GaussianBlur(180))
    shade = Image.new("RGB", size, CREAM_DEEP)
    base = Image.composite(base, shade, ImageOps.invert(vignette))
    return base


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def fit_ui(ui: Image.Image, max_w: int, max_h: int) -> Image.Image:
    ui = ui.convert("RGB")
    # Never upscale UI captures
    scale = min(max_w / ui.width, max_h / ui.height, 1.0)
    if scale < 1.0:
        ui = ui.resize((max(1, int(ui.width * scale)), max(1, int(ui.height * scale))), Image.Resampling.LANCZOS)
    return ui


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def load_logo(max_h: int) -> Image.Image | None:
    for path in LOGO_CANDIDATES:
        if path.exists():
            im = Image.open(path).convert("RGBA")
            ratio = max_h / im.height
            im = im.resize((max(1, int(im.width * ratio)), max_h), Image.Resampling.LANCZOS)
            return im
    return None


def compose_one(frame: dict, device_key: str) -> dict:
    device = DEVICES[device_key]
    canvas_w, canvas_h = device["size"]
    raw_path = RAW_DIR / f"{frame['id']}-{device_key}.png"
    if not raw_path.exists():
        raise FileNotFoundError(raw_path)

    canvas = paper_background((canvas_w, canvas_h))
    draw = ImageDraw.Draw(canvas)

    # Prefer static display face; Fraunces variable TTFs are unreliable in Pillow.
    display = FONTS / "DMSerifDisplay-Regular.ttf"
    if not display.exists():
        display = FONTS / "Fraunces.ttf"
    headline_font = load_font(display, device["headline_size"])
    support_font = load_font(FONTS / "Inter.ttf", device["support_size"])
    brand_font = load_font(FONTS / "Inter.ttf", 28 if device_key == "iphone" else 30)

    side = device["side_margin"]
    top_safe = int(canvas_h * 0.045)
    text_max_w = canvas_w - side * 2

    y = top_safe
    if frame["show_logo"]:
        logo = load_logo(56 if device_key == "iphone" else 64)
        if logo is not None:
            lx = (canvas_w - logo.width) // 2
            canvas.paste(logo, (lx, y), logo)
            y += logo.height + 28
        else:
            brand = "FOUNDER MODE ADVICE"
            bw = draw.textlength(brand, font=brand_font)
            draw.text(((canvas_w - bw) / 2, y), brand, font=brand_font, fill=INK)
            # red underline accent under ADVICE-ish brand
            draw.rectangle(
                ((canvas_w - bw) / 2, y + 34, (canvas_w - bw) / 2 + bw, y + 38),
                fill=RED,
            )
            y += 58
    else:
        # Thin red editorial rule for sequence continuity
        rule_w = 72
        draw.rectangle(
            ((canvas_w - rule_w) / 2, y + 8, (canvas_w + rule_w) / 2, y + 12),
            fill=RED,
        )
        y += 36

    lines = wrap_text(draw, frame["headline"], headline_font, text_max_w)
    for i, line in enumerate(lines):
        lw = draw.textlength(line, font=headline_font)
        draw.text(((canvas_w - lw) / 2, y), line, font=headline_font, fill=INK)
        y += int(device["headline_size"] * 1.12)
    y += 10

    if frame.get("support"):
        support_lines = wrap_text(draw, frame["support"], support_font, int(text_max_w * 0.92))
        for line in support_lines:
            lw = draw.textlength(line, font=support_font)
            draw.text(((canvas_w - lw) / 2, y), line, font=support_font, fill=INK_SOFT)
            y += int(device["support_size"] * 1.35)
        y += 18

    # UI placement
    ui = Image.open(raw_path).convert("RGB")
    # Ensure exact source dims before fitting
    if ui.size != device["size"]:
        # Studio captures at exact viewport; if mismatch, letterbox-fit without stretch inventing UI.
        pass

    bottom_margin = int(canvas_h * 0.04)
    available_top = max(y + 12, int(canvas_h * device["ui_top_ratio"]))
    max_ui_h = canvas_h - available_top - bottom_margin
    max_ui_w = canvas_w - side * 2
    ui_fitted = fit_ui(ui, max_ui_w, max_ui_h)

    # Restrained device frame: thin ink bezel, generous UI
    pad = 10 if device_key == "iphone" else 12
    frame_w = ui_fitted.width + pad * 2
    frame_h = ui_fitted.height + pad * 2
    radius = device["radius"]
    device_frame = Image.new("RGB", (frame_w, frame_h), INK)
    mask = rounded_mask((frame_w, frame_h), radius)
    inner_mask = rounded_mask((ui_fitted.width, ui_fitted.height), max(10, radius - 8))
    framed = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    framed.paste(device_frame, (0, 0), mask)
    framed.paste(ui_fitted, (pad, pad), inner_mask)

    # Soft drop shadow
    shadow = Image.new("RGBA", (frame_w + 80, frame_h + 80), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle((30, 40, frame_w + 50, frame_h + 50), radius=radius + 8, fill=(0, 0, 0, 55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))

    fx = (canvas_w - frame_w) // 2
    fy = available_top + max(0, (max_ui_h - frame_h) // 2)
    # If text ate too much room, pin UI just under text
    if fy < available_top:
        fy = available_top

    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.alpha_composite(shadow, (fx - 40, fy - 30))
    canvas_rgba.alpha_composite(framed, (fx, fy))

    # Flatten to opaque RGB
    out = Image.new("RGB", (canvas_w, canvas_h), CREAM)
    out.paste(canvas_rgba.convert("RGB"), (0, 0))

    # Final safety crop/pad to exact size
    if out.size != (canvas_w, canvas_h):
        out = out.resize((canvas_w, canvas_h), Image.Resampling.LANCZOS)

    out_name = f"{frame['file']}-{device['suffix']}.png"
    out_path = OUT_DIR / out_name
    out.save(out_path, format="PNG", optimize=True)
    # Verify opaque
    verify = Image.open(out_path)
    assert verify.size == (canvas_w, canvas_h), (out_name, verify.size)
    assert verify.mode == "RGB", (out_name, verify.mode)
    return {
        "filename": out_name,
        "device": device["label"],
        "dimensions": f"{canvas_w}x{canvas_h}",
        "source_capture": str(raw_path.relative_to(ROOT)),
        "headline": frame["headline"],
        "qa_status": "pass",
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    for device_key in ("iphone", "ipad"):
        for frame in FRAMES:
            manifest.append(compose_one(frame, device_key))
    manifest_path = OUT_DIR / "MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    # Also write a human-readable markdown manifest
    lines = [
        "# App Store Screenshot Manifest",
        "",
        "| File | Device | Dimensions | Source capture | Headline | QA |",
        "|---|---|---|---|---|---|",
    ]
    for row in manifest:
        lines.append(
            f"| `{row['filename']}` | {row['device']} | {row['dimensions']} | `{row['source_capture']}` | {row['headline']} | {row['qa_status']} |"
        )
    (OUT_DIR / "MANIFEST.md").write_text("\n".join(lines) + "\n")
    print(f"Wrote {len(manifest)} assets to {OUT_DIR}")


if __name__ == "__main__":
    main()
