"""Generate B3ANS canonical south-facing idle sprite using Gemini API.

Generates a 1024x1024 image with magenta (#FF00FF) background.
Saves to assets/characters/beans/_raw/beans-idle-s-v1.png
"""

import os
import sys
import base64
import json
import urllib.request
import urllib.error

# Load API key
script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)
env_path = os.path.join(project_dir, ".env")

api_key = None
with open(env_path, "r") as f:
    for line in f:
        if line.startswith("GEMINI_API_KEY="):
            api_key = line.strip().split("=", 1)[1]
            break

if not api_key:
    print("ERROR: GEMINI_API_KEY not found in .env")
    sys.exit(1)

# B3ANS character prompt
prompt = """Generate a single character sprite on a solid magenta (#FF00FF) background.

CHARACTER: B3ANS — a floating robot orb companion.
- Round spherical body, roughly basketball-sized proportionally
- Big expressive screen-face covering the front ~40% of the sphere, displaying friendly digital eyes (like a happy emoji on an OLED screen)
- The screen/eye glows cyan (#00d4ff)
- Panel seams visible on the metallic body — looks homemade but well-crafted, neat not janky
- Small antenna on top, one or two small stickers on the body
- Hover jets on the bottom emitting a soft cyan (#00d4ff) glow
- No visible arms or legs in idle pose (arms are retractable)
- Color palette: silver/grey metallic body, cyan glowing elements, dark screen background behind the eyes
- The robot is floating slightly, not resting on the ground

POSE: South-facing idle (facing toward the camera/viewer), floating in place.

STYLE: premium HD pixel art, high resolution, detailed textures, rich color depth, smooth color gradients with anti-aliased edges, atmospheric lighting with bloom and glow effects, modern pixel art quality like Sea of Stars or Octopath Traveler, high detail shading with smooth blending between colors, detailed light falloff and fine pixel work, translucent layering where appropriate, NOT chunky retro 16-bit pixels, NOT flat shading, NOT low-res, light source from upper-left, shadows falling to lower-right, top surfaces brightest, left faces medium, right faces darkest, no text, no writing, no letters, no words.

COMPOSITION:
- Single character centered on canvas
- Solid magenta (#FF00FF) background filling the entire image
- No ground plane, no shadows on ground, no environment
- Character should fill roughly 60-70% of the canvas height
- Clean edges between character and magenta background
"""

# Gemini API endpoint for image generation
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key={api_key}"

payload = {
    "contents": [
        {
            "parts": [
                {"text": prompt}
            ]
        }
    ],
    "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"],
        "temperature": 0.8
    }
}

print("Calling Gemini API to generate B3ANS canonical sprite...")
print("This may take 15-30 seconds...")

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=120) as response:
        result = json.loads(response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    error_body = e.read().decode("utf-8")
    print(f"API Error {e.code}: {error_body}")
    sys.exit(1)
except Exception as e:
    print(f"Request failed: {e}")
    sys.exit(1)

# Extract image from response
image_saved = False
output_path = os.path.join(
    project_dir, "assets", "characters", "beans", "_raw", "beans-idle-s-v1.png"
)

if "candidates" in result:
    for candidate in result["candidates"]:
        if "content" in candidate and "parts" in candidate["content"]:
            for part in candidate["content"]["parts"]:
                if "inlineData" in part:
                    img_data = base64.b64decode(part["inlineData"]["data"])
                    os.makedirs(os.path.dirname(output_path), exist_ok=True)
                    with open(output_path, "wb") as f:
                        f.write(img_data)
                    print(f"Saved B3ANS sprite to: {output_path}")
                    print(f"File size: {len(img_data):,} bytes")
                    image_saved = True
                    break
                elif "text" in part:
                    print(f"Text response: {part['text'][:200]}")
        if image_saved:
            break

if not image_saved:
    print("ERROR: No image was generated. Full response:")
    print(json.dumps(result, indent=2)[:2000])
    sys.exit(1)

print("\nB3ANS v1 canonical sprite generated successfully!")
print(f"Output: {output_path}")
print("Please review the sprite before proceeding with directional poses.")
