"""Art asset post-processing pipeline for Noah's Game.

Handles chroma key removal, trimming, resizing, sprite sheet slicing,
and direction mirroring. Called after Gemini image generation.

Usage:
    python3 tools/art_pipeline.py chroma_key input.png output.png [tolerance]
    python3 tools/art_pipeline.py trim input.png output.png [padding]
    python3 tools/art_pipeline.py resize input.png output.png width height
    python3 tools/art_pipeline.py slice sheet.png output_dir base_name frame_count
    python3 tools/art_pipeline.py mirror input.png output.png
    python3 tools/art_pipeline.py full_pipeline input.png output.png width height
"""

import sys
import os
from PIL import Image
import numpy as np


def chroma_key_magenta(input_path: str, output_path: str, tolerance: int = 60) -> str:
    """Remove #FF00FF magenta background, producing true alpha transparency."""
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)

    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]

    # Core magenta: high R, low G, high B
    magenta_mask = (
        (r > (255 - tolerance)) & (g < tolerance) & (b > (255 - tolerance))
    )

    # Edge pixels: partial transparency based on distance from pure magenta
    magenta_distance = np.sqrt(
        (r.astype(float) - 255) ** 2
        + g.astype(float) ** 2
        + (b.astype(float) - 255) ** 2
    )
    edge_mask = (magenta_distance < tolerance * 2) & ~magenta_mask

    # Pure magenta -> fully transparent
    data[magenta_mask] = [0, 0, 0, 0]

    # Edge pixels -> partial transparency proportional to magenta distance
    if np.any(edge_mask):
        alpha_values = np.clip(
            magenta_distance[edge_mask] / (tolerance * 2) * 255, 0, 255
        )
        data[edge_mask, 3] = alpha_values.astype(np.uint8)
        # Remove magenta spill from edge pixel colors
        data[edge_mask, 1] = np.clip(
            data[edge_mask, 1].astype(int) + 30, 0, 255
        ).astype(np.uint8)

    result = Image.fromarray(data)
    result.save(output_path)
    return output_path


def trim_to_content(input_path: str, output_path: str, padding: int = 8) -> str:
    """Crop image to content bounding box with padding on all sides."""
    img = Image.open(input_path).convert("RGBA")
    bbox = img.getbbox()
    if not bbox:
        img.save(output_path)
        return output_path

    padded = (
        max(0, bbox[0] - padding),
        max(0, bbox[1] - padding),
        min(img.width, bbox[2] + padding),
        min(img.height, bbox[3] + padding),
    )
    trimmed = img.crop(padded)
    trimmed.save(output_path)
    return output_path


def resize_nearest(input_path: str, output_path: str, w: int, h: int) -> str:
    """Resize using nearest-neighbor interpolation (preserves pixel art)."""
    img = Image.open(input_path).convert("RGBA")
    resized = img.resize((w, h), Image.NEAREST)
    resized.save(output_path)
    return output_path


def slice_sprite_sheet(
    sheet_path: str, output_dir: str, base_name: str, frame_count: int
) -> int:
    """Slice a horizontal sprite strip into individual frames."""
    os.makedirs(output_dir, exist_ok=True)
    sheet = Image.open(sheet_path).convert("RGBA")
    frame_width = sheet.width // frame_count
    frame_height = sheet.height

    for i in range(frame_count):
        frame = sheet.crop((i * frame_width, 0, (i + 1) * frame_width, frame_height))
        frame.save(os.path.join(output_dir, f"{base_name}_f{i:03d}.png"))

    return frame_count


def mirror_horizontal(input_path: str, output_path: str) -> str:
    """Horizontally flip a sprite to create the mirrored direction."""
    img = Image.open(input_path).convert("RGBA")
    mirrored = img.transpose(Image.FLIP_LEFT_RIGHT)
    mirrored.save(output_path)
    return output_path


def full_pipeline(
    input_path: str,
    output_path: str,
    target_w: int,
    target_h: int,
    tolerance: int = 60,
    padding: int = 8,
) -> str:
    """Run the complete pipeline: chroma key -> trim -> resize."""
    # Step 1: Chroma key
    keyed_path = input_path.replace(".png", "_keyed.png")
    chroma_key_magenta(input_path, keyed_path, tolerance)

    # Step 2: Trim
    trimmed_path = input_path.replace(".png", "_trimmed.png")
    trim_to_content(keyed_path, trimmed_path, padding)

    # Step 3: Resize to target
    resize_nearest(trimmed_path, output_path, target_w, target_h)

    # Clean intermediates
    for tmp in [keyed_path, trimmed_path]:
        if os.path.exists(tmp) and tmp != output_path:
            os.remove(tmp)

    return output_path


def mirror_directions(source_dir: str, character: str, action: str) -> int:
    """Generate mirrored directions from existing sprites.

    Mirrors: nw->ne, w->e, sw->se
    """
    mirror_map = {"nw": "ne", "w": "e", "sw": "se"}
    count = 0

    for src_dir, dst_dir in mirror_map.items():
        # Try both single-frame and sprite sheet naming
        for suffix in ["", "-4f", "-6f", "-3f", "-5f", "-2f"]:
            src_name = f"{character}-{action}-{src_dir}{suffix}.png"
            dst_name = f"{character}-{action}-{dst_dir}{suffix}.png"
            src_path = os.path.join(source_dir, src_name)
            dst_path = os.path.join(source_dir, dst_name)

            if os.path.exists(src_path):
                mirror_horizontal(src_path, dst_path)
                print(f"  Mirrored: {src_name} -> {dst_name}")
                count += 1

    return count


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "chroma_key":
        tol = int(sys.argv[4]) if len(sys.argv) > 4 else 60
        result = chroma_key_magenta(sys.argv[2], sys.argv[3], tol)
        print(f"Chroma key done: {result}")

    elif cmd == "trim":
        pad = int(sys.argv[4]) if len(sys.argv) > 4 else 8
        result = trim_to_content(sys.argv[2], sys.argv[3], pad)
        print(f"Trimmed: {result}")

    elif cmd == "resize":
        result = resize_nearest(
            sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
        )
        print(f"Resized: {result}")

    elif cmd == "slice":
        count = slice_sprite_sheet(
            sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
        )
        print(f"Sliced into {count} frames")

    elif cmd == "mirror":
        result = mirror_horizontal(sys.argv[2], sys.argv[3])
        print(f"Mirrored: {result}")

    elif cmd == "full_pipeline":
        result = full_pipeline(
            sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
        )
        print(f"Pipeline complete: {result}")

    elif cmd == "mirror_directions":
        count = mirror_directions(sys.argv[2], sys.argv[3], sys.argv[4])
        print(f"Mirrored {count} direction files")

    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)
