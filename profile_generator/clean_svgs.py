#!/usr/bin/env python3
"""
clean_svgs.py
Removes gray-fill path/rect/ellipse/polygon/circle elements from all SVGs in a folder.
Gray is defined as: r≈g≈b (all within 30 of each other) and all
channel values between 150–220.

Backs up originals before overwriting in place.
"""

import re
import shutil
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

# ── Namespace handling ────────────────────────────────────────────────────────
NS_MAP = {}

def register_namespaces(svg_text: str):
    """Extract and register all namespace declarations so ET doesn't mangle them."""
    for prefix, uri in re.findall(r'xmlns(?::(\w+))?=["\']([^"\']+)["\']', svg_text):
        prefix = prefix or ''
        NS_MAP[prefix] = uri
        ET.register_namespace(prefix, uri)

# ── Color parsing ─────────────────────────────────────────────────────────────

def parse_color(color_str: str):
    """Return (r, g, b) tuple or None from a CSS/SVG color value."""
    if not color_str or color_str in ('none', 'inherit', 'transparent', 'currentColor'):
        return None
    s = color_str.strip()
    # rgb(r, g, b)
    m = re.match(r'rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', s)
    if m:
        return int(m.group(1)), int(m.group(2)), int(m.group(3))
    # #rrggbb
    m = re.match(r'#([0-9A-Fa-f]{6})$', s)
    if m:
        h = m.group(1)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    # #rgb
    m = re.match(r'#([0-9A-Fa-f]{3})$', s)
    if m:
        h = m.group(1)
        return int(h[0]*2, 16), int(h[1]*2, 16), int(h[2]*2, 16)
    return None


def get_fill(elem) -> str | None:
    """Extract the fill value from an element's style attribute or fill attribute."""
    style = elem.get('style', '')
    m = re.search(r'(?:^|;)\s*fill\s*:\s*([^;]+)', style)
    if m:
        return m.group(1).strip()
    return elem.get('fill')


def is_gray(rgb) -> bool:
    """True if color is in the 150–220 near-neutral gray band."""
    if rgb is None:
        return False
    r, g, b = rgb
    in_range = all(150 <= c <= 220 for c in (r, g, b))
    near_equal = max(r, g, b) - min(r, g, b) <= 30
    return in_range and near_equal


# ── SVG cleaning ──────────────────────────────────────────────────────────────

REMOVABLE_TAGS = {'path', 'rect', 'ellipse', 'polygon', 'circle'}

def local_tag(elem) -> str:
    """Strip namespace URI from tag name."""
    tag = elem.tag
    if tag.startswith('{'):
        tag = tag.split('}', 1)[1]
    return tag


def collect_removals(parent, removed: list):
    """Recursively walk the tree, collecting (parent, child) pairs to remove."""
    for child in list(parent):
        tag = local_tag(child)
        if tag in REMOVABLE_TAGS:
            fill_str = get_fill(child)
            rgb = parse_color(fill_str) if fill_str else None
            if is_gray(rgb):
                removed.append((parent, child, fill_str, rgb))
                continue  # don't recurse into removed element
        collect_removals(child, removed)


def clean_svg(input_path: Path) -> list:
    """
    Clean a single SVG in place. Returns list of removed (parent, child, fill_str, rgb).
    Raises on parse error.
    """
    input_text = input_path.read_text(encoding='utf-8')
    register_namespaces(input_text)

    clean_text = re.sub(r'<\?xml[^?]*\?>', '', input_text)
    clean_text = re.sub(r'<!DOCTYPE[^[>]*(?:\[[^\]]*\])?\s*>', '', clean_text).strip()

    tree = ET.ElementTree(ET.fromstring(clean_text))
    root = tree.getroot()

    removed = []
    collect_removals(root, removed)

    if removed:
        for parent, child, fill_str, rgb in removed:
            parent.remove(child)

        ET.indent(root, space='    ')
        output_text = ET.tostring(root, encoding='unicode', xml_declaration=False)
        output_text = '<?xml version="1.0" encoding="UTF-8"?>\n' + output_text
        input_path.write_text(output_text, encoding='utf-8')

    return removed


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    src_dir    = Path.home() / 'Desktop' / 'Mascot Library' / 'Exported Logos Only'
    backup_dir = Path.home() / 'Desktop' / 'Mascot Library' / 'Exported Logos Only Backup'

    svg_files = sorted(src_dir.glob('*.svg'))
    if not svg_files:
        print(f'No SVG files found in {src_dir}')
        sys.exit(1)

    # ── Backup ────────────────────────────────────────────────────────────────
    if backup_dir.exists():
        print(f'Backup directory already exists — skipping backup copy.')
        print(f'  {backup_dir}')
    else:
        print(f'Backing up {len(svg_files)} files to:')
        print(f'  {backup_dir}')
        shutil.copytree(src_dir, backup_dir)
        print('  Backup complete.\n')

    # ── Process ───────────────────────────────────────────────────────────────
    total_removed  = 0
    no_removal     = []
    errors         = []

    for svg_path in svg_files:
        try:
            removed = clean_svg(svg_path)
            count = len(removed)
            total_removed += count
            if count == 0:
                no_removal.append(svg_path.name)
            else:
                print(f'  [{count:3d} removed]  {svg_path.name}')
        except Exception as e:
            errors.append((svg_path.name, str(e)))

    # ── Report ────────────────────────────────────────────────────────────────
    print()
    print('═' * 60)
    print(f'Files processed : {len(svg_files)}')
    print(f'Total elements removed : {total_removed}')
    print(f'Files with no removal  : {len(no_removal)}')

    if errors:
        print(f'\nErrors ({len(errors)}):')
        for name, err in errors:
            print(f'  {name}: {err}')

    if no_removal:
        print(f'\nFiles where nothing was removed ({len(no_removal)}):')
        for name in no_removal:
            print(f'  {name}')
