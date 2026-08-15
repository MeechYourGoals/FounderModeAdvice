#!/usr/bin/env python3
"""Compose App Store screenshots around locked, rights-cleared UI captures.

Visual direction: premium midnight navy field, luminous cobalt accents,
restrained champagne-gold detail, large editorial serif headlines, crisp white
supporting copy, subtle depth/network texture.

The UI inside every frame comes ONLY from app-store-assets/screenshots/raw/,
captured from /__screenshots/:frame with SAMPLE_* demo data. Nothing here
invents interface, and no public-figure likenesses are used.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "app-store-assets" / "screenshots" / "raw"
OUT_DIR = ROOT / "app-store-assets" / "screenshots" / "production"
FONTS = ROOT / "scripts" / "fonts"
MARK_CANDIDATES = [
    ROOT / "app-store-assets" / "brand" / "master-appicon-1024.png",
    ROOT / "app-store-assets" / "icon-1024.png",
]

# Midnight navy / cobalt / champagne system
NAVY_TOP = (7, 14, 32)
NAVY_DEEP = (3, 8, 20)
COBALT = (37, 99, 235)
COBALT_SOFT = (59, 130, 246)
GOLD = (226, 189, 122)
WHITE = (247, 249, 255)
WHITE_SOFT = (196, 206, 228)

FRAMES = [
    {
        "id": "action",
        "file": "01-action",
        "headline": "Build your boardroom",
        "support": "Pick the operators whose judgment you want in the room.",
        "eyebrow": "YOUR PERSONAL ADVISORY BOARD",
        "show_mark": True,
    },
    {
        "id": "operating-memo",
        "file": "02-operating-memo",
        "headline": "Make anyone your mentor",
        "support": "Paste any public link and it becomes an operating memo.",
        "eyebrow": "LEARN FROM THE PEOPLE YOU ADMIRE",
        "show_mark": True,
    },
    {
        "id": "source-grounded",
        "file": "03-source-grounded",
        "headline": "Distill their best insights",
        "support": "Every lesson stays anchored to the source you gave it.",
        "eyebrow": "LESS NOISE. MORE CLARITY.",
        "show_mark": True,
    },
    {
        "id": "lessons-risks-actions",
        "file": "04-lessons-risks-actions",
        "headline": "See lessons, risks & next moves",
        "support": "Structured for the decision in front of you today.",
        "eyebrow": "DECIDE WITH CONVICTION",
        "show_mark": False,
    },
    {
        "id": "follow-up-qa",
        "file": "05-follow-up-qa",
        "headline": "Ask your C-suite anything",
        "support": "Follow-up answers grounded in your own company context.",
        "eyebrow": "A BOARD MEETING, ON DEMAND",
        "show_mark": False,
    },
    {
        "id": "library",
        "file": "06-library",
        "headline": "Build your founder playbook",
        "support": "Profiles, folders, and insight that compounds over time.",
        "eyebrow": "YOUR PRIVATE FOUNDER PLAYBOOK",
        "show_mark": False,
    },
    {
        "id": "search",
        "file": "07-search",
        "headline": "Find the right advice instantly",
        "support": "Search and filter every insight you have ever saved.",
        "eyebrow": "RECALL IN ONE MOVE",
        "show_mark": False,
    },
    {
        "id": "save-share",
        "file": "08-save-share",
        "headline": "Keep your team in the room",
        "support": "Export the memo and share it with the people executing.",
        "eyebrow": "ALIGNED ON THE SAME PAGE",
        "show_mark": True,
    },
]

DEVICES = {
    "iphone": {
        "label": "iphone-6.9",
        "size": (1320, 2868),
        "suffix": "iphone-6.9",
        "side_margin": 84,
        "top_safe": 150,
        "device_top": 900,
        "radius": 74,
        "mark_size": 62,
        "eyebrow_size": 27,
        "headline_size": 86,
        "support_size": 34,
    },
    "ipad": {
        "label": "ipad-13",
        "size": (2064, 2752),
        "suffix": "ipad-13",
        "side_margin": 140,
        "top_safe": 140,
        "device_top": 880,
        "radius": 54,
        "mark_size": 70,
        "eyebrow_size": 30,
        "headline_size": 96,
        "support_size": 38,
    },
}



def load_font(path: Path, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError:
        return ImageFont.load_default()


def midnight_background(size: tuple[int, int], seed: int) -> Image.Image:
    """Navy gradient + soft cobalt bloom + faint network constellation."""
    w, h = size
    base = Image.new("RGB", size, NAVY_DEEP)
    draw = ImageDraw.Draw(base)
    for y in range(h):
        t = y / max(h - 1, 1)
        # deeper toward the bottom, slightly lifted at the top
        e = t ** 0.85
        r = int(NAVY_TOP[0] * (1 - e) + NAVY_DEEP[0] * e)
        g = int(NAVY_TOP[1] * (1 - e) + NAVY_DEEP[1] * e)
        b = int(NAVY_TOP[2] * (1 - e) + NAVY_DEEP[2] * e)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Cobalt bloom behind the headline block
    bloom = Image.new("RGB", size, (0, 0, 0))
    bdraw = ImageDraw.Draw(bloom)
    bdraw.ellipse(
        (-w * 0.35, -h * 0.20, w * 1.35, h * 0.46),
        fill=(COBALT[0] // 2, COBALT[1] // 2, COBALT[2]),
    )
    bloom = bloom.filter(ImageFilter.GaussianBlur(int(w * 0.16)))
    base = Image.blend(base, bloom, 0.30)

    # Faint champagne glow low in the frame (echoes the icon's warm floor)
    warm = Image.new("RGB", size, (0, 0, 0))
    wdraw = ImageDraw.Draw(warm)
    wdraw.ellipse((w * 0.18, h * 0.84, w * 0.82, h * 1.12), fill=GOLD)
    warm = warm.filter(ImageFilter.GaussianBlur(int(w * 0.13)))
    base = Image.blend(base, warm, 0.055)

    # Subtle network texture: sparse nodes + short links, very low contrast
    rng = random.Random(seed)
    net = Image.new("RGBA", size, (0, 0, 0, 0))
    ndraw = ImageDraw.Draw(net)
    nodes = [(rng.uniform(0, w), rng.uniform(0, h)) for _ in range(46)]
    for i, (x1, y1) in enumerate(nodes):
        for x2, y2 in nodes[i + 1 :]:
            if math.hypot(x2 - x1, y2 - y1) < w * 0.20:
                ndraw.line([(x1, y1), (x2, y2)], fill=(*COBALT_SOFT, 20), width=2)
    for x, y in nodes:
        r = rng.uniform(2.5, 5.0)
        ndraw.ellipse((x - r, y - r, x + r, y + r), fill=(*WHITE_SOFT, 34))
    net = net.filter(ImageFilter.GaussianBlur(1.4))
    out = base.convert("RGBA")
    out.alpha_composite(net)
    return out.convert("RGB")


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def fit_ui(ui: Image.Image, max_w: int, max_h: int) -> Image.Image:
    ui = ui.convert("RGB")
    scale = min(max_w / ui.width, max_h / ui.height, 1.0)
    if scale < 1.0:
        ui = ui.resize((max(1, int(ui.width * scale)), max(1, int(ui.height * scale))), Image.Resampling.LANCZOS)
    return ui


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
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


def load_mark(max_h: int) -> Image.Image | None:
    for path in MARK_CANDIDATES:
        if path.exists():
            im = Image.open(path).convert("RGB")
            im = im.resize((max_h, max_h), Image.Resampling.LANCZOS)
            rgba = im.convert("RGBA")
            rgba.putalpha(rounded_mask((max_h, max_h), int(max_h * 0.24)))
            return rgba
    return None


def compose_one(frame: dict, device_key: str, index: int) -> dict:
    device = DEVICES[device_key]
    canvas_w, canvas_h = device["size"]
    raw_path = RAW_DIR / f"{frame['id']}-{device_key}.png"
    if not raw_path.exists():
        raise FileNotFoundError(raw_path)

    canvas = midnight_background((canvas_w, canvas_h), seed=1000 + index)
    draw = ImageDraw.Draw(canvas)

    display = FONTS / "DMSerifDisplay-Regular.ttf"
    if not display.exists():
        display = FONTS / "Fraunces.ttf"
    headline_font = load_font(display, device["headline_size"])
    support_font = load_font(FONTS / "Inter.ttf", device["support_size"])
    eyebrow_font = load_font(FONTS / "Inter.ttf", device["eyebrow_size"])
    wordmark_font = load_font(FONTS / "Inter.ttf", device["eyebrow_size"])

    side = device["side_margin"]
    text_max_w = canvas_w - side * 2
    y = device["top_safe"]

    # Lockup: mark + wordmark, left aligned like the reference sheet
    if frame["show_mark"]:
        mark = load_mark(device["mark_size"])
        if mark is not None:
            canvas.paste(mark, (side, y), mark)
            label = "FOUNDER MODE ADVICE"
            _, top, _, bottom = wordmark_font.getbbox(label)
            label_h = bottom - top
            draw.text(
                (side + mark.width + 22, y + (mark.height - label_h) / 2 - top),
                label,
                font=wordmark_font,
                fill=WHITE,
            )
            y += mark.height + 46
    else:
        # keep vertical rhythm consistent across the set
        y += device["mark_size"] + 46

    # Champagne eyebrow
    draw.text((side, y), frame["eyebrow"], font=eyebrow_font, fill=GOLD)
    y += int(device["eyebrow_size"] * 2.1)

    lines = wrap_text(draw, frame["headline"], headline_font, text_max_w)
    for line in lines:
        draw.text((side, y), line, font=headline_font, fill=WHITE)
        y += int(device["headline_size"] * 1.14)
    y += int(device["headline_size"] * 0.12)

    support_lines = wrap_text(draw, frame["support"], support_font, int(text_max_w * 0.94))
    for line in support_lines:
        draw.text((side, y), line, font=support_font, fill=WHITE_SOFT)
        y += int(device["support_size"] * 1.42)

    # Cobalt rule tying the text block to the device
    y += int(device["support_size"] * 0.7)
    draw.rectangle((side, y, side + int(canvas_w * 0.11), y + 5), fill=COBALT_SOFT)
    y += int(device["support_size"] * 1.5)

    # UI placement — real capture, never upscaled, never stretched
    ui = Image.open(raw_path).convert("RGB")
    bottom_margin = device["bottom_safe"]
    max_ui_h = canvas_h - y - bottom_margin
    max_ui_w = canvas_w - side * 2
    ui_fitted = fit_ui(ui, max_ui_w, max_ui_h)

    pad = 12 if device_key == "iphone" else 14
    frame_w = ui_fitted.width + pad * 2
    frame_h = ui_fitted.height + pad * 2
    radius = device["radius"]

    bezel = Image.new("RGB", (frame_w, frame_h), (12, 20, 40))
    mask = rounded_mask((frame_w, frame_h), radius)
    inner_mask = rounded_mask((ui_fitted.width, ui_fitted.height), max(12, radius - 10))
    framed = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    framed.paste(bezel, (0, 0), mask)
    framed.paste(ui_fitted, (pad, pad), inner_mask)

    # Cobalt edge light + deep shadow for premium depth
    glow = Image.new("RGBA", (frame_w + 160, frame_h + 160), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.rounded_rectangle(
        (60, 60, frame_w + 100, frame_h + 100), radius=radius + 16, fill=(*COBALT, 80)
    )
    glow = glow.filter(ImageFilter.GaussianBlur(46))

    shadow = Image.new("RGBA", (frame_w + 160, frame_h + 160), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle(
        (70, 90, frame_w + 110, frame_h + 130), radius=radius + 12, fill=(0, 0, 0, 150)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))

    fx = (canvas_w - frame_w) // 2
    fy = y + max(0, (max_ui_h - frame_h) // 2)

    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.alpha_composite(shadow, (fx - 80, fy - 80))
    canvas_rgba.alpha_composite(glow, (fx - 80, fy - 80))
    canvas_rgba.alpha_composite(framed, (fx, fy))

    out = Image.new("RGB", (canvas_w, canvas_h), NAVY_DEEP)
    out.paste(canvas_rgba.convert("RGB"), (0, 0))

    out_name = f"{frame['file']}-{device['suffix']}.png"
    out_path = OUT_DIR / out_name
    out.save(out_path, format="PNG", optimize=True)

    verify = Image.open(out_path)
    assert verify.size == (canvas_w, canvas_h), (out_name, verify.size)
    assert verify.mode == "RGB", (out_name, verify.mode)
    return {
        "filename": out_name,
        "device": device["label"],
        "dimensions": f"{canvas_w}x{canvas_h}",
        "source_capture": str(raw_path.relative_to(ROOT)),
        "headline": frame["headline"],
        "support": frame["support"],
        "qa_status": "pass",
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    for device_key in ("iphone", "ipad"):
        for index, frame in enumerate(FRAMES):
            manifest.append(compose_one(frame, device_key, index))
    (OUT_DIR / "MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n")
    lines = [
        "# App Store Screenshot Manifest",
        "",
        "| File | Device | Dimensions | Source capture | Headline | Supporting line | QA |",
        "|---|---|---|---|---|---|---|",
    ]
    for row in manifest:
        lines.append(
            f"| `{row['filename']}` | {row['device']} | {row['dimensions']} | "
            f"`{row['source_capture']}` | {row['headline']} | {row['support']} | {row['qa_status']} |"
        )
    (OUT_DIR / "MANIFEST.md").write_text("\n".join(lines) + "\n")
    print(f"Wrote {len(manifest)} assets to {OUT_DIR}")


if __name__ == "__main__":
    main()
