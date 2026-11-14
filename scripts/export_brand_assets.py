#!/usr/bin/env python3
"""Export TrainPaceLab's approved SVG sources to deterministic PNG dimensions.

Run: python3 -m pip install cairosvg pillow
     python3 scripts/export_brand_assets.py
No remote downloads, no changes to the existing logo-300x300.png.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
EXPORTS = (
    ("trainpacelab-icon.svg", "trainpacelab-icon-192.png", 192, 192),
    ("trainpacelab-icon.svg", "trainpacelab-icon-512.png", 512, 512),
    ("trainpacelab-icon.svg", "trainpacelab-apple-touch-180.png", 180, 180),
    ("trainpacelab-icon.svg", "trainpacelab-favicon-32.png", 32, 32),
    ("trainpacelab-maskable.svg", "trainpacelab-maskable-512.png", 512, 512),
    ("trainpacelab-social.svg", "trainpacelab-social-1200x630.png", 1200, 630),
)

def main():
    try:
        import cairosvg
        from PIL import Image
    except ImportError:
        sys.exit("Missing export dependencies: python3 -m pip install cairosvg pillow")
    for source, target, width, height in EXPORTS:
        src, dst = ASSETS / source, ASSETS / target
        if not src.is_file():
            sys.exit(f"Missing source SVG: {src}")
        cairosvg.svg2png(url=str(src), write_to=str(dst),
                         output_width=width, output_height=height)
        with Image.open(dst) as image:
            image.verify()
        with Image.open(dst) as image:
            if image.size != (width, height) or image.format != "PNG":
                sys.exit(f"Invalid export: {dst}")
        print(f"{target}: {width}x{height} ({dst.stat().st_size} bytes)")
    print("Exported six raster assets. Review 16/32px readability and social preview before release.")

if __name__ == "__main__":
    main()
