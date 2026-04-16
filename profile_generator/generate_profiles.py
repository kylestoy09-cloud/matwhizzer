#!/usr/bin/env python3
"""
MatWhizzer School Profile Picture Generator
Generates 512x512 WebP profile pictures for 326 NJ high schools.

Layout (template viewBox 724x559):
  Zone 1 (y=0–314):   Hex interior — mascot image, spills over edges/top
  Zone 2 (y=315–390): Gap band — school name text (Bebas Neue)
  Zone 3 (y=391–540): Bottom frame — mascot name text (Bebas Neue, smaller)

Color logic:
  - 1-color SVG: recolor using color1, background = color2
  - 2-color SVG: recolor using color1→color2, background = color3
  - 3+ color SVG: recolor using color1→color2→color3 (darkest→lightest),
                  background = whichever of black/white/gray is not in the SVG

Text color: whichever of color1/color2 has better contrast against the background
"""

import csv
import os
import re
import sys
import math
import colorsys
import io
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image, ImageDraw, ImageFont
import cairosvg

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR     = Path(__file__).parent
MASCOT_DIR     = Path.home() / "Desktop" / "Mascot Library" / "Exported Logos Only"
TEMPLATE_PATH  = SCRIPT_DIR / "School_Profile_Template.svg"
CSV_PATH       = SCRIPT_DIR / "Mascot_List.csv"
FONT_PATH      = SCRIPT_DIR / "fonts" / "StardosStencil-Bold.ttf"
OUTPUT_DIR     = SCRIPT_DIR / "exports"
OUTPUT_DIR.mkdir(exist_ok=True)

# ── Template zone coords (in 724×559 space) ──────────────────────────────────
TEMPLATE_W, TEMPLATE_H = 724, 559
OUTPUT_SIZE = 512

# Zone 1: mascot image area (hex interior + allowed spill)
MASCOT_ZONE = (151, 2, 573, 314)   # x1,y1,x2,y2  (spill allowed above/sides)

# Zone 2: school name band
NAME_ZONE   = (20, 315, 704, 390)  # full width gap band

# Zone 3: mascot name (bottom center break)
NICK_ZONE   = (200, 395, 524, 480) # centered bottom area

# ── Helpers ───────────────────────────────────────────────────────────────────

def hex_to_rgb(h: str) -> tuple:
    h = h.strip().lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_hex(r, g, b) -> str:
    return f"#{r:02X}{g:02X}{b:02X}"

def luminance(hex_color: str) -> float:
    r, g, b = hex_to_rgb(hex_color)
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def contrast_ratio(c1: str, c2: str) -> float:
    l1, l2 = luminance(c1), luminance(c2)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def best_text_color(bg_hex: str, candidates: list) -> str:
    """Pick the candidate with best contrast against bg."""
    return max(candidates, key=lambda c: contrast_ratio(bg_hex, c))

def colors_are_similar(h1: str, h2: str, threshold: float = 30) -> bool:
    r1,g1,b1 = hex_to_rgb(h1)
    r2,g2,b2 = hex_to_rgb(h2)
    return math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2) < threshold

def extract_svg_colors(svg_text: str) -> list:
    """Extract unique hex colors from SVG. Returns list in first-seen order
    (no luminance sort — caller does closest-match assignment)."""
    raw = re.findall(r'#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b', svg_text)
    seen, unique = set(), []
    for c in raw:
        if len(c) == 3:
            c = ''.join(ch*2 for ch in c)
        h = '#' + c.upper()
        # Skip pure white and near-white (background artifacts)
        r,g,b = hex_to_rgb(h)
        if r > 245 and g > 245 and b > 245:
            continue
        # Deduplicate similar colors
        close = False
        for existing in unique:
            if colors_are_similar(h, existing, threshold=25):
                close = True
                break
        if not close:
            seen.add(h)
            unique.append(h)
    return unique


def rgb_distance(h1: str, h2: str) -> float:
    """Euclidean distance between two hex colors in RGB space."""
    r1,g1,b1 = hex_to_rgb(h1)
    r2,g2,b2 = hex_to_rgb(h2)
    return math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)

def recolor_svg(svg_text: str, color_map: dict) -> str:
    """Replace colors in SVG text. color_map: {old_hex: new_hex}"""
    result = svg_text
    # Sort by length descending to avoid partial replacements
    for old, new in sorted(color_map.items(), key=lambda x: -len(x[0])):
        old_upper = old.upper()
        old_lower = old.lower()
        result = result.replace(old_upper, new.upper())
        result = result.replace(old_lower, new.upper())
        result = result.replace(old, new.upper())
        # Also handle short-form if applicable
        old_clean = old.lstrip('#')
        result = re.sub(rf'#{old_clean}', new.upper(), result, flags=re.IGNORECASE)
    return result

def svg_to_pil(svg_text: str, width: int, height: int) -> Image.Image:
    """Render SVG text to PIL Image with transparency."""
    png = cairosvg.svg2png(
        bytestring=svg_text.encode(),
        output_width=width,
        output_height=height,
        background_color=None
    )
    return Image.open(io.BytesIO(png)).convert('RGBA')

def get_svg_aspect(svg_text: str) -> float:
    """Return width/height ratio from SVG viewBox or width/height attributes."""
    vb = re.search(r'viewBox=["\'][\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)["\']', svg_text)
    if vb:
        return float(vb.group(1)) / float(vb.group(2))
    w = re.search(r'\bwidth=["\']([0-9.]+)', svg_text)
    h = re.search(r'\bheight=["\']([0-9.]+)', svg_text)
    if w and h:
        return float(w.group(1)) / float(h.group(1))
    return 1.0

def fit_text(draw, text, font_path, max_w, max_h, start_size=120, min_size=14):
    """Return (font, x, y) fitting text into box, auto-sizing."""
    size = start_size
    while size >= min_size:
        try:
            font = ImageFont.truetype(str(font_path), size)
        except Exception:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        if tw <= max_w and th <= max_h:
            return font, tw, th
        size -= 2
    return ImageFont.load_default(), 0, 0

def determine_background(color1, color2, color3, svg_colors_count):
    """
    Determine background color based on number of SVG colors.
    - 1 color SVG: bg = color2, mascot uses color1
    - 2 color SVG: bg = color3
    - 3+ color SVG: bg = whichever of black/white/gray isn't in the mascot colors
    """
    candidates = ['#000000', '#FFFFFF', '#808080']
    school_colors = [color1, color2, color3]
    
    if svg_colors_count <= 1:
        return color2
    elif svg_colors_count == 2:
        return color3
    else:
        # Find neutral not already used as school color
        for neutral in candidates:
            conflict = any(colors_are_similar(neutral, sc, threshold=60) for sc in school_colors)
            if not conflict:
                return neutral
        return '#808080'  # fallback gray


def generate_profile(row: dict, mascot_dir: Path, template_svg: str, font_path: Path) -> Image.Image:
    school_id   = row['school_id']
    name        = row['display_name'].strip()
    mascot_name = row['mascot_name'].strip()
    color1      = row['color1'].strip()
    color2      = row['color2'].strip()
    color3      = row['color3'].strip()
    mascot_file = row['mascot_file_name'].strip()

    # ── 1. Load mascot SVG ────────────────────────────────────────────────────
    mascot_path = mascot_dir / mascot_file
    if not mascot_path.exists():
        raise FileNotFoundError(f"Mascot not found: {mascot_path}")

    with open(mascot_path, 'r', errors='replace') as f:
        mascot_svg = f.read()

    # ── 2. Detect SVG colors ──────────────────────────────────────────────────
    svg_colors = extract_svg_colors(mascot_svg)
    n_colors   = len(svg_colors)

    # ── 3. Build color map: detected → closest school color by RGB distance ──────
    school_colors = [color1, color2, color3]
    color_map = {}
    for detected in svg_colors:
        closest = min(school_colors, key=lambda sc: rgb_distance(detected, sc))
        color_map[detected] = closest

    recolored_svg = recolor_svg(mascot_svg, color_map) if color_map else mascot_svg

    # ── 4. Determine background ───────────────────────────────────────────────
    bg_color = determine_background(color1, color2, color3, n_colors)

    # ── 5. Build template with school background color ────────────────────────
    # Replace the gray placeholder background with the school's bg color.
    # The regex approach below was dropping the closing quote (m.group(3)) causing
    # invalid XML; the simple replace is sufficient since the template uses rgb().
    final_template = template_svg.replace('fill:rgb(140,140,140)', f'fill:{bg_color}')

    # ── 6. Render template to PIL ─────────────────────────────────────────────
    scale = OUTPUT_SIZE / TEMPLATE_W
    out_h = int(TEMPLATE_H * scale)
    template_img = svg_to_pil(final_template, OUTPUT_SIZE, out_h)
    canvas = Image.new('RGBA', (OUTPUT_SIZE, OUTPUT_SIZE), bg_color + 'FF' if len(bg_color)==7 else bg_color)
    # Paste template centered vertically if needed
    ty = (OUTPUT_SIZE - out_h) // 2
    canvas.paste(template_img, (0, ty), template_img)

    draw = ImageDraw.Draw(canvas)

    # ── 7. Scale zone coords to output size ───────────────────────────────────
    sx = OUTPUT_SIZE / TEMPLATE_W
    sy = OUTPUT_SIZE / TEMPLATE_H  # note: we map to square

    def sc(x, y):
        return int(x * sx), int(y * sy)

    mx1,my1,mx2,my2 = MASCOT_ZONE
    nx1,ny1,nx2,ny2 = NAME_ZONE
    kx1,ky1,kx2,ky2 = NICK_ZONE

    # Scale all zones
    mx1,my1 = sc(mx1, my1)
    mx2,my2 = sc(mx2, my2)
    nx1,ny1 = sc(nx1, ny1)
    nx2,ny2 = sc(nx2, ny2)
    kx1,ky1 = sc(kx1, ky1)
    kx2,ky2 = sc(kx2, ky2)

    # ── 8. Render mascot with intentional spill ───────────────────────────────
    aspect = get_svg_aspect(recolored_svg)
    zone_w  = mx2 - mx1
    zone_h  = my2 - my1

    # Determine spill: tall images overflow top, wide images overflow sides
    if aspect < 0.85:  # tall mascot → spill top
        render_w = zone_w
        render_h = int(render_w / aspect)
        spill_top = max(0, render_h - zone_h)
        mascot_x  = mx1
        mascot_y  = my1 - spill_top  # spill upward (can go negative = off canvas top)
        # Allow up to 40% spill over top
        mascot_y  = max(-int(render_h * 0.4), mascot_y)
    elif aspect > 1.15:  # wide mascot → spill sides
        render_h = zone_h
        render_w = int(render_h * aspect)
        spill    = (render_w - zone_w) // 2
        mascot_x = mx1 - spill
        mascot_y = my1
        # Allow up to 35% spill per side
        max_spill = int(render_w * 0.35)
        mascot_x  = max(-max_spill, mascot_x)
    else:  # square-ish → fill zone, slight spill all around
        render_w = int(zone_w * 1.15)
        render_h = int(zone_h * 1.15)
        mascot_x = mx1 - (render_w - zone_w) // 2
        mascot_y = my1 - (render_h - zone_h) // 2

    # Hard floor: mascot bottom must not cross into name zone
    name_top = ny1
    if mascot_y + render_h > name_top:
        render_h = name_top - mascot_y
        render_w = int(render_h * aspect)

    if render_w > 0 and render_h > 0:
        mascot_img = svg_to_pil(recolored_svg, render_w, render_h)
        canvas.paste(mascot_img, (mascot_x, mascot_y), mascot_img)

    # ── 9. School name text in gap band ───────────────────────────────────────
    name_zone_w = nx2 - nx1
    name_zone_h = ny2 - ny1
    text_color = best_text_color(bg_color, [color1, color2])

    name_font, name_tw, name_th = fit_text(
        draw, name.upper(), font_path,
        max_w=name_zone_w - 10, max_h=name_zone_h - 4, start_size=80
    )
    name_x = nx1 + (name_zone_w - name_tw) // 2
    name_y = ny1 + (name_zone_h - name_th) // 2
    draw.text((name_x, name_y), name.upper(), font=name_font, fill=text_color)

    # ── 10. Mascot name text in bottom zone ───────────────────────────────────
    nick_zone_w = kx2 - kx1
    nick_zone_h = ky2 - ky1
    nick_font, nick_tw, nick_th = fit_text(
        draw, mascot_name.upper(), font_path,
        max_w=nick_zone_w, max_h=nick_zone_h - 4, start_size=52
    )
    nick_x = kx1 + (nick_zone_w - nick_tw) // 2
    nick_y = ky1 + (nick_zone_h - nick_th) // 2
    nick_color = best_text_color(bg_color, [color1, color2])
    draw.text((nick_x, nick_y), mascot_name.upper(), font=nick_font, fill=nick_color)

    # ── 11. Convert to RGB for WebP export ────────────────────────────────────
    final = Image.new('RGB', (OUTPUT_SIZE, OUTPUT_SIZE), hex_to_rgb(bg_color))
    final.paste(canvas, mask=canvas.split()[3])
    return final


def clean_svg(svg_text: str) -> str:
    """Strip XML declaration, DOCTYPE, and the Color-1/Color-2 placeholder groups
    from the template. Those groups contain the design-time mascot placeholder
    (JPEG <use> refs + decorative vector paths that render as an icon over the
    text zone). The actual mascot is composited separately as a PIL image."""
    svg_text = re.sub(r'<\?xml[^?]*\?>', '', svg_text)
    svg_text = re.sub(r'<!DOCTYPE[^[>]*(?:\[[^\]]*\])?\s*>', '', svg_text)
    # Hide Color-1 and Color-2 placeholder groups (design-time mascot content).
    # Can't strip with regex due to nested </g> tags; opacity=0 is safe and equivalent.
    svg_text = re.sub(r'(<g\s+id="Color-[12]")', r'\1 opacity="0"', svg_text)
    return svg_text.strip()


def main():
    # Load template
    with open(TEMPLATE_PATH, 'r') as f:
        template_svg = clean_svg(f.read())

    # Load CSV
    with open(CSV_PATH, newline='', encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))

    # Optional: filter to specific school_ids passed as args
    if len(sys.argv) > 1:
        ids = set(sys.argv[1:])
        rows = [r for r in rows if r['school_id'] in ids]
        print(f"Processing {len(rows)} school(s): {ids}")

    total = len(rows)
    ok, skipped, errors = 0, 0, []

    for i, row in enumerate(rows):
        sid  = row['school_id']
        name = row['display_name']
        out_path = OUTPUT_DIR / f"{sid}.webp"

        try:
            img = generate_profile(row, MASCOT_DIR, template_svg, FONT_PATH)
            img.save(str(out_path), 'WEBP', quality=90)
            ok += 1
            print(f"[{i+1}/{total}] ✓ {sid} {name}")
        except FileNotFoundError as e:
            skipped += 1
            print(f"[{i+1}/{total}] SKIP {sid} {name}: {e}")
            errors.append((sid, name, str(e)))
        except Exception as e:
            skipped += 1
            print(f"[{i+1}/{total}] ERR  {sid} {name}: {e}")
            errors.append((sid, name, str(e)))

    print(f"\nDone: {ok} generated, {skipped} skipped")
    if errors:
        print("\nErrors:")
        for sid, name, msg in errors:
            print(f"  {sid} {name}: {msg}")


if __name__ == '__main__':
    main()
