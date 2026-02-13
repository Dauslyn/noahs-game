# Noah's Game — Technical Art Bible

> **READ THIS ENTIRE DOCUMENT before generating ANY art asset.**
> This is the single source of truth for all visual production. Every Claude Code session, every generation call, every import decision must follow this spec. Designed to be reusable across projects — swap Sections 2 and 5 for a new game.

---

## Table of Contents

1. [Visual Foundation](#1-visual-foundation) — Style, perspective, lighting, color
2. [Game Identity](#2-game-identity) — Characters, world, tone
3. [Technical Geometry](#3-technical-geometry) — Tile math, scale chart, anchor points
4. [Animation Standards](#4-animation-standards) — Frame counts, timing, sheets, mirroring
5. [Asset Catalog](#5-asset-catalog) — Every asset with exact specs
6. [Generation Pipeline](#6-generation-pipeline) — AI model, prompts, reference system
7. [Post-Generation Pipeline](#7-post-generation-pipeline) — Chroma key, cleanup, trimming
8. [Godot Import & Rendering](#8-godot-import--rendering) — Settings, z-sort, glow, post-processing
9. [UI Art Direction](#9-ui-art-direction) — HUD, menus, fonts
10. [Quality Standards](#10-quality-standards) — Checklists, do/don't, acceptance tests
11. [Decision Lock Register](#11-decision-lock-register) — What's final vs. provisional

---

## 1. Visual Foundation

### 1.1 Art Style: "Octopath Pixel"

HD pixel art with cinematic lighting. Pixel art as the rendering medium, but with modern production values — rich lighting, atmospheric depth, smooth gradients, glow effects, colored shadows.

**What this IS:**
- Pixel art with visible but refined pixel structure
- Rich dramatic lighting (bloom, glow, ambient light, colored shadows)
- Smooth color gradients within pixel-art rendering
- High color count — NOT limited to 16 or 32 colors
- Anti-aliased edges where appropriate
- Atmospheric depth (fog, particles, parallax layers)

**What this is NOT:**
- ❌ Retro 16-bit SNES style
- ❌ Flat shading
- ❌ Photorealistic / painterly
- ❌ Low-res chunky pixels (no deliberate downscaling to 32×32)

**Visual reference games (closest match first):**
1. **Sea of Stars** — rich colors, atmospheric, warm
2. **Octopath Traveler** — HD-2D lighting on pixel art
3. **Hades** — isometric perspective, action combat, stunning environments
4. **Eastward** — detailed environments, warm cozy lighting
5. **CrossCode** — clean, vivid, readable (our quality floor)

### 1.2 Camera Perspective: Isometric (2:1 Pixel Ratio)

> ⚠️ **CRITICAL: The isometric angle is 26.57° (2:1 pixel slope), NOT true 30°.**
> Every diagonal line follows a strict 2-pixels-horizontal to 1-pixel-vertical rule.
> Prompting "30 degrees" produces slightly wrong angles. Always say "2:1 isometric pixel art perspective" in prompts.

**What this means for art:**
- Floor tiles are **diamond-shaped** (isometric rhombus)
- Objects show the **top face AND one or two side faces**
- Characters are viewed from slightly above-front
- Depth sorting determines draw order (see Section 8.3)
- All diagonal edges follow the 2:1 pixel slope

### 1.3 Global Lighting Direction

> ⚠️ **LOCKED: Light comes from the UPPER-LEFT. No exceptions. Every asset. Always.**

| Surface | Brightness |
|---------|-----------|
| **Top face** | Brightest (receives direct light) |
| **Left-facing vertical surface** | Medium (angled toward light) |
| **Right-facing vertical surface** | Darkest (in shadow) |

**Cast shadows:** Fall to the **lower-right**. Shadow length ≈ 25% of object height.

**Character drop shadow:** Small elliptical shadow beneath feet, matching the iso tile diamond shape. Color: `#000000` at 40% opacity. Shadow does NOT rotate with character facing direction — it always falls lower-right.

**Per-prompt enforcement:** EVERY generation prompt must include:
```
light source from upper-left, shadows falling to lower-right,
top surfaces brightest, left faces medium, right faces darkest
```

### 1.4 Color Philosophy

**NOT cold clinical steel. This is a kid's universe.**

Noah is 12. Kids have janky spaceships the way we used to have old bikes. The world feels **warm, lived-in, and full of wonder**.

**Universal accent colors (ALL environments):**

| Role | Hex | Color | Usage |
|------|-----|-------|-------|
| Tech/Friendly | `#00d4ff` | Cyan | B3ANS eye, energy, friendly systems |
| Home/Comfort | `#ffaa33` | Warm amber | Ship lights, safe areas |
| Danger | `#ff4444` | Soft red | Enemies, damage, warnings |
| Health/Nature | `#44ff66` | Green | Health pickups, nature, safe zones |

**Shadow hue shift:** Shadows shift toward blue-purple (`#2a1f4e`). Never darken by just adding black.

**Highlight hue shift:** Highlights shift toward warm yellow (`#fff4d6`). Never lighten by just adding white.

**Per-biome palettes:** See Section 5.5.

**Noah's locked colors:**

| Part | Hex | Description |
|------|-----|-------------|
| Skin | `#e8b88a` | Warm medium skin tone |
| Hair | `#5c3a1e` | Dark brown |
| Jumpsuit (base) | `#d4903a` | Warm orange-tan |
| Jumpsuit (shadow) | `#a06828` | Darker orange-brown |
| Belt/pouches | `#4a3520` | Dark brown leather |
| Boots | `#2d2d2d` | Near-black with grey |
| Goggles glass | `#88ccdd` | Light cyan |
| Tool accents | `#8899aa` | Silver-grey |

*Note: These are target colors. AI-generated output will approximate — post-generation palette snapping aligns them precisely.*

---

## 2. Game Identity

### 2.1 World & Tone

**Setting:** A universe where kids explore space in little janky ships. Adventure is normal for 12-year-olds. Tone: adventurous, warm, curious, scrappy, wonder-filled. Danger exists but the world is ultimately exciting, not grimdark.

### 2.2 Characters

#### Noah (Player)
- 12-year-old boy, brown hair, brown eyes
- Warm orange-tan utility jumpsuit (NOT military)
- Brown utility belt with pouches for tools + spare B3ANS parts
- Small practical backpack
- Goggles pushed up on forehead
- Fingerless gloves, sci-fi boots
- Expression: determined, curious — never grizzled
- Patches/badges on jumpsuit (personality touches)

#### B3ANS (Companion Orb)
- Round floating robot orb, no arms/legs normally
- Big expressive screen-face with digital eyes (emoji on OLED)
- Emotions via eye shape: happy, alert, sad, angry
- Retractable utility arms (extend when needed)
- Panel seams, small antennas, one or two stickers
- Cyan glow from eye-screen + hover jets
- Homemade-but-advanced — neat, not janky

#### Walker Enemy
- Hostile alien/corrupted drone
- Red/dark accents, aggressive posture
- Mechanical or bio-mechanical
- Bipedal, hunched, threatening

#### Boss: The Warden
- ~3× player size, heavy armored frame
- Visible weak point nodes that change color per phase
- Phase 1: Subtle glow | Phase 2: Orange glow + minor damage | Phase 3: Red glow + cracks

---

## 3. Technical Geometry

### 3.1 Isometric Tile Dimensions

```
The isometric diamond:

        ╱╲
      ╱    ╲        Width = 64px
    ╱        ╲       Height = 32px
    ╲        ╱       Ratio = 2:1
      ╲    ╱         Angle = 26.57°
        ╲╱

All diagonals follow 2px horizontal : 1px vertical
```

| Measurement | Value | Notes |
|-------------|-------|-------|
| **Ground tile footprint** | 64×32 px | Diamond shape, 2:1 ratio |
| **One height unit** | 24 px | Height of one "story" (vertical face of a wall block) |
| **Wall tile total** | 64×56 px | 32px top diamond + 24px vertical face |
| **Sub-tile grid** | 32×16 px | Each tile divides into 4 quadrants for fine placement |
| **Generation size** | 1024×1024 px | Raw AI output, downscaled to game size |
| **Downscale method** | Nearest-neighbor | Preserves pixel art crispness |

### 3.2 Scale Chart

> ⚠️ **All sizes are measured in tile-height units (1 tile-height = 32px vertical).**

| Entity | Height (tile units) | Footprint | Pixel height (approx) |
|--------|-------------------|-----------|----------------------|
| **Noah** | 1.5 | 1×1 tile | ~48px |
| **B3ANS** | 0.75 | <1×1 tile | ~24px |
| **Walker enemy** | 1.25 | 1×1 tile | ~40px |
| **Warden boss** | 3.0 | 2×2 tiles | ~96px |
| **Crate** | 0.625 | 1×1 tile | ~20px |
| **Console/terminal** | 0.75 | 1×1 tile | ~24px |
| **Energy core** | 1.0 | 1×1 tile | ~32px |
| **Barrel** | 0.75 | 1×1 tile | ~24px |
| **Door frame** | 1.5 | 1×2 tiles | ~48px |
| **Med station** | 1.0 | 1×1 tile | ~32px |

**Scale reference image:** Save a composite image showing Noah, B3ANS, a Walker, and key props standing on a tile grid at correct relative scale → `assets/reference/scale_ref.png`

### 3.3 Anchor Points & Sprite Registration

Every sprite must have a defined **origin point** (where it "touches the ground" in isometric space).

| Asset type | Origin point | Godot offset |
|-----------|-------------|-------------|
| **Characters** | Bottom-center of feet contact | `Sprite2D.offset.y` = -half_height |
| **Props (1×1)** | Bottom-center of base diamond | Same as characters |
| **Props (multi-tile)** | Bottom-center of front-most tile | Adjust per prop |
| **Floor tiles** | Center of diamond | Default (no offset) |
| **Wall tiles** | Bottom-center of front edge | `offset.y` = -wall_height |

**Canvas padding:** All sprites include **8px transparent padding** on all sides after trimming. This accommodates:
- Glow/emission bleeding past the sprite edge
- Drop shadow rendering
- Animation frames that extend slightly beyond idle bounds

### 3.4 Standardized Canvas Sizes (After Trimming)

| Asset type | Trimmed canvas | Notes |
|-----------|---------------|-------|
| Character (idle/walk frame) | 64×80 px | Width accommodates arm swing |
| Character (attack frame) | 96×80 px | Wider for weapon reach |
| B3ANS (all) | 48×48 px | Square, smaller than Noah |
| Warden boss | 160×128 px | 2×2 tile footprint |
| Floor tile | 64×32 px | Exact diamond bounds |
| Wall tile | 64×56 px | Diamond + one height unit |
| Prop (1×1) | 64×64 px | Allows height variation |
| Projectile | 32×32 px | Small, with glow padding |
| Effect frame | 64×64 px | Allows for expansion |

---

## 4. Animation Standards

### 4.1 Frame Counts & Timing

| Action | Frames | FPS | Loop | Notes |
|--------|--------|-----|------|-------|
| **Idle/breathing** | 4 | 6 | Yes | Subtle body rise/fall |
| **Walk cycle** | 6 | 8 | Yes | Full step-step cycle |
| **Run cycle** | 6 | 10 | Yes | Longer stride than walk |
| **Dash/dodge** | 4 | 12 | No | Fast burst, plays once |
| **Attack (ranged)** | 3 | 12 | No | Quick shoot pose |
| **Attack (melee)** | 5 | 12 | No | Wind-up → strike → follow-through |
| **Hit/stagger** | 2 | 8 | No | Recoil, plays once |
| **Death** | 5 | 8 | No | Collapse, plays once |
| **B3ANS hover bob** | 4 | 6 | Yes | Gentle up-down float |
| **B3ANS shoot** | 3 | 12 | No | Flash from emitter port |

### 4.2 Direction System

**8 isometric directions**, numbered 0-7 clockwise from South:

```
        N (4)
   NW (3)   NE (5)
  W (2)       E (6)
   SW (1)   SE (7)
        S (0)
```

| Dir # | Name | Abbreviation | Generated? | Mirror source |
|-------|------|-------------|-----------|---------------|
| 0 | South | `s` | ✅ Generate | — |
| 1 | South-West | `sw` | ✅ Generate | — |
| 2 | West | `w` | ✅ Generate | — |
| 3 | North-West | `nw` | ✅ Generate | — |
| 4 | North | `n` | ✅ Generate | — |
| 5 | North-East | `ne` | ❌ Mirror | Flip `nw` horizontally |
| 6 | East | `e` | ❌ Mirror | Flip `w` horizontally |
| 7 | South-East | `se` | ❌ Mirror | Flip `sw` horizontally |

**This cuts generation work nearly in half.** Generate 5 directions, mirror 3.

### 4.3 Sprite Sheet Layout

**Single-direction sheet:** Horizontal strip, left to right.
```
[frame0][frame1][frame2][frame3][frame4][frame5]
```

**Multi-direction sheet:** Rows top-to-bottom in direction order (0-7).
```
Row 0 (S):  [f0][f1][f2][f3][f4][f5]
Row 1 (SW): [f0][f1][f2][f3][f4][f5]
Row 2 (W):  [f0][f1][f2][f3][f4][f5]
Row 3 (NW): [f0][f1][f2][f3][f4][f5]
Row 4 (N):  [f0][f1][f2][f3][f4][f5]
Rows 5-7: Generated by mirroring rows 3, 2, 1
```

**Every frame in a sheet has IDENTICAL canvas dimensions.** No frame can differ in size.

### 4.4 Animation Pivot Rules

- Character feet stay at the **same Y position** across all walk/run frames
- Vertical bounce = body moves UP, feet stay planted
- Arms swing forward/back but don't extend past the standardized canvas width
- Attack frames that extend beyond idle canvas use the wider attack canvas size (96×80)

### 4.5 File Naming Convention

```
{character}-{action}-{direction}-{framecount}f.png

Examples:
  noah-idle-s-4f.png        (Noah idle facing south, 4 frames)
  noah-walk-sw-6f.png       (Noah walk cycle facing south-west, 6 frames)
  noah-attack-w-5f.png      (Noah attack facing west, 5 frames)
  beans-hover-default-4f.png (B3ANS hover bob, no direction)
  walker-walk-s-6f.png      (Walker walking south, 6 frames)
```

For single images (idle poses, props, tiles):
```
noah-idle-s.png
floor-metal-clean.png
prop-crate-01.png
wall-solid.png
```

---

## 5. Asset Catalog

### 5.1 Floor Tiles

All rendered as **isometric diamonds** in 2:1 pixel perspective.

| ID | Description | Key Visual Elements |
|----|-------------|-------------------|
| `floor-metal-clean` | Standard station floor | Panel lines, small rivets, slight color variation |
| `floor-metal-worn` | Scuffed/used floor | Scratches, boot marks, faded areas |
| `floor-metal-grated` | Ventilation grating | Grid pattern, dark gaps, faint underglow |
| `floor-metal-glowing` | Tech panel floor | Embedded cyan or amber light strips, bloom |
| `floor-metal-damaged` | Broken floor | Cracks, exposed wiring, scorch marks |

### 5.2 Wall Segments

Isometric walls showing **top face + front face** (one height unit = 24px).

| ID | Description | Key Visual Elements |
|----|-------------|-------------------|
| `wall-solid` | Basic wall | Thick metal plating, cast shadow to lower-right |
| `wall-pipe` | Pipe wall | Exposed pipes on surface, steam wisps |
| `wall-vent` | Ventilation wall | Grated panels, subtle interior glow |
| `wall-screen` | Display wall | Embedded glowing monitor |
| `wall-corner` | Corner piece | Reinforced joint, heavier plating |
| `wall-damaged` | Broken wall | Crumbled section, exposed internals |

### 5.3 Props

All in **isometric perspective** matching game camera. Sizes per scale chart (Section 3.2).

| ID | Description |
|----|-------------|
| `prop-crate` | Metal crate, shipping labels, latches, amber status light |
| `prop-console` | Glowing screen, keyboard, blinking lights |
| `prop-energy-core` | Glowing orb/cylinder in housing, bright energy glow |
| `prop-barrel` | Cylindrical, warning labels/stripes |
| `prop-broken-machine` | Sparking, exposed wires, smoke |
| `prop-computer-rack` | Blinking LEDs, cable runs |
| `prop-med-station` | Green health symbol, white/green accents |

### 5.4 Characters & Animations

| Character | Static Sprites | Animation Sheets |
|-----------|---------------|-----------------|
| **Noah** | Idle ×5 directions | Walk ×5 dir (6f each), Dash ×3 dir (4f), Attack ×3 dir (3f), Hit (2f), Death (5f) |
| **B3ANS** | Default, Happy, Alert, Sad | Hover bob (4f), Shoot flash (3f) |
| **Walker** | Idle ×5 directions | Walk ×5 dir (6f), Attack (4f) |
| **Warden** | Phase 1, Phase 2, Phase 3 | Charge (6f), Laser (4f) |

### 5.5 Environment Biomes

| Biome | Dominant | Accents | Mood |
|-------|---------|---------|------|
| **Space Station** | Dark steel, gunmetal | Warm amber, cyan tech | Industrial, worn |
| **Noah's Ship** | Warm browns, soft orange | Amber lamps, cyan screens | Cozy, homey |
| **Ice World** | Deep blue, white, pale grey | Aurora green, ice cyan | Cold, vast |
| **Volcanic** | Deep red, black rock | Orange lava, amber | Dangerous, dramatic |
| **Alien Jungle** | Rich green, dark earth | Bioluminescent cyan/magenta | Lush, mysterious |
| **Crystal Caves** | Purple, deep blue | Prismatic rainbow, magenta | Magical, alien |
| **Alien City** | Dark buildings, warm gold | Neon colors, alien green | Advanced, strange |
| **Abandoned Tech** | Rust orange, faded grey | Overgrown green, moss | Eerie, ancient |

### 5.6 Projectiles

| ID | Visual | Colors |
|----|--------|--------|
| `proj-laser` | Energy bolt + glow trail | Cyan `#00d4ff`, white core |
| `proj-rocket` | Small missile + exhaust | Orange body, bright flame |
| `proj-plasma` | Swirling energy ball | Purple `#9944ff`, magenta glow |

### 5.7 Effects

| ID | Frames | Description |
|----|--------|-------------|
| `fx-explosion` | 5 | Expanding fireball, orange/yellow → dark smoke |
| `fx-hit-spark` | 3 | White flash, colored edges match damage type |
| `fx-dash-trail` | 3 | Semi-transparent afterimage, fading |
| `fx-muzzle-flash` | 2 | Bright burst at emission point |

### 5.8 Parallax Backgrounds (Per Biome)

| Layer | Scroll Speed | Content Type |
|-------|-------------|-------------|
| **Far** | Slowest | Sky, space, distant landscape |
| **Mid** | Medium | Mid-ground structures, terrain silhouettes |
| **Near** | Fastest | Close elements: pipes, cables, foliage |

---

## 6. Generation Pipeline

### 6.1 Model & API

| Setting | Value |
|---------|-------|
| **Model** | `gemini-3-pro-image-preview` |
| **Endpoint** | `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent` |
| **API key** | `noahs-game-godot/.env` → `GEMINI_API_KEY` (gitignored) |
| **Output format** | PNG, 1024×1024 (model default) |

**Temperature guide:**

| Use case | Temperature | Why |
|----------|------------|-----|
| Standard (tiles, props, BGs) | 1.0 | Good variety with quality |
| Sprite sheets | 0.8 | More consistency between frames |
| Concept exploration | 1.2 | More creative variation |

### 6.2 Chroma Key Background

> ⚠️ **Gemini does NOT produce real PNG transparency.** It renders a checkerboard pattern that is baked into the image. We use a **magenta chroma key** instead.

**For any asset that needs transparency** (characters, props, effects, projectiles):

```
Place the subject on a SOLID BRIGHT MAGENTA background (hex #FF00FF, pure magenta).
The entire background must be uniform solid #FF00FF with absolutely no variation or gradient.
```

**Why magenta, not green:**
- Our art palette uses cyan and green extensively → green screen would conflict
- Magenta (`#FF00FF`) appears in none of our game's color palettes
- Standard industry chroma key alternative

**For floor tiles and backgrounds:** No chroma key needed — they fill their entire canvas.

### 6.3 Style Reference System

> **Every generation call after the first MUST include the style reference image.**

The style reference anchors all assets to the same visual language.

**Reference image:** `assets/reference/style_ref.png`

**API call structure:**
```json
{
  "contents": [{
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/png",
          "data": "<base64 of style_ref.png>"
        }
      },
      {
        "text": "Match the art style of the reference image (pixel art quality, shading, color temperature, detail level). <asset prompt here>"
      }
    ]
  }],
  "generationConfig": {
    "responseModalities": ["IMAGE", "TEXT"],
    "temperature": 1.0
  }
}
```

**For character animation sheets:** Include BOTH the style reference AND the character's idle sprite as reference images.

### 6.4 Prompt Templates

**Base style phrase (include in ALL prompts):**
```
premium HD pixel art, high resolution, detailed textures, rich color depth,
smooth color gradients with anti-aliased edges, atmospheric lighting with
bloom and glow effects, modern pixel art quality like Sea of Stars or
Octopath Traveler, high detail shading with smooth blending between colors,
detailed light falloff and fine pixel work, translucent layering where
appropriate, NOT chunky retro 16-bit pixels, NOT flat shading, NOT low-res,
light source from upper-left, shadows falling to lower-right,
top surfaces brightest, left faces medium, right faces darkest,
no text, no writing, no letters, no words
```

> **CRITICAL: The "NOT chunky" clause is mandatory.** Without it, Gemini frequently
> drifts into coarse retro pixel art that is visually inconsistent with the HD
> assets. Always include "NOT chunky retro 16-bit pixels" in every prompt.

#### Floor Tiles
```
Match the art style of the reference image. Generate a single isometric floor
tile in 2:1 isometric pixel art perspective (26.57 degree angle, diamond shaped).
[TILE DESCRIPTION]. {base style phrase}. Seamless tileable edges.
Square 1:1 output. Output only the image.
```

#### Wall Segments
```
Match the art style of the reference image. Generate an isometric wall block
in 2:1 isometric perspective. The wall shows a diamond-shaped top face and a
visible front face showing height. [WALL DESCRIPTION].
{base style phrase}. On a solid #FF00FF magenta background. Output only the image.
```

#### Props
```
Match the art style of the reference image. Generate [PROP DESCRIPTION] in
2:1 isometric pixel art perspective (viewed from above-front). [DETAILS].
{base style phrase}. On a solid #FF00FF magenta background.
Square 1:1 output. Output only the image.
```

#### Characters (Single Pose)
```
Match the art style of the reference image. Generate a character sprite of
[CHARACTER] standing in 2:1 isometric perspective as they would appear in a
2D isometric game. Full body, [FACING DIRECTION]. [OUTFIT DETAILS].
{base style phrase}. On a solid #FF00FF magenta background.
Square 1:1 output. Output only the image.
```

#### Character Directional Sprites (8-Direction System)

> **CRITICAL CONSISTENCY PROTOCOL:** Character directions are the hardest asset
> to keep consistent. Follow these rules strictly:
>
> 1. **One direction per API call.** Turnaround sheets (multiple poses in one
>    image) produce overlapping characters and inconsistent designs. Never use them.
> 2. **Always include the canonical idle sprite as image reference.** The
>    south-facing idle is the "ground truth" — every other direction must match it.
> 3. **Describe what's VISIBLE, not just the angle.** Gemini needs explicit
>    body-part descriptions to produce genuinely different directions.
> 4. **Generate 5, mirror 3.** Generate S, SW, W, NW, N. Mirror SW→SE, W→E, NW→NE.

**API call structure for each direction:**
```json
{
  "contents": [{
    "parts": [
      { "inline_data": { "mime_type": "image/png", "data": "<CANONICAL_IDLE_BASE64>" } },
      { "text": "<DIRECTION_PROMPT>" }
    ]
  }],
  "generationConfig": { "responseModalities": ["TEXT", "IMAGE"] }
}
```

**Direction prompt template:**
```
Look at this character carefully. This is [NAME] — [FULL OUTFIT DESCRIPTION
WITH COLORS: jumpsuit color, goggles, backpack, belt, boots, etc.].

Now draw this EXACT SAME CHARACTER from a [DIRECTION] VIEW.
[EXPLICIT BODY VISIBILITY DESCRIPTION — see below].

CRITICAL REQUIREMENTS:
- SAME character, SAME outfit colors, SAME proportions, SAME level of detail
- Isometric camera angle: slightly above looking down (~30 degrees from above)
- SOLID FLAT #FF00FF magenta background — NO checkerboard, NO gradient
- {base style phrase}
- Single character only, centered in the image
- No shadow on the ground
```

**Body visibility descriptions per direction:**

| Direction | Prompt text for body visibility |
|-----------|-------------------------------|
| S (south) | "Facing the camera directly. Full front view — we see both eyes, full chest, both arms at sides, both legs." |
| SW | "Body rotated 45° to our right. We see his face at 3/4 angle (both eyes visible but face angled), more of his left shoulder and left side. Backpack partially visible behind right shoulder." |
| W (west) | "TRUE SIDE PROFILE facing left. We see ONLY his left side. Face in full profile — only ONE eye visible. Left arm in front, right arm hidden behind body. Backpack visible on his back." |
| NW | "Rotated 45° AWAY from camera. We see mostly his BACK — left shoulder visible, back of head, backpack prominent. Only a sliver of his face visible at the left edge (one cheek/ear)." |
| N (north) | "Facing COMPLETELY AWAY from camera. Full BACK view — we see his backpack, back of his hair, both arms from behind. NO face visible at all." |

#### Character Sprite Sheet
```
This is [CHARACTER]. Generate a sprite sheet showing this exact character
[ACTION] in 2:1 isometric perspective. Horizontal strip of exactly [N] frames,
left to right. Each frame IDENTICAL canvas size. Character identical across all
frames — same outfit, proportions, colors — only [BODY PARTS] move. Feet stay
at the same Y position across all frames. {base style phrase}.
On a solid #FF00FF magenta background. Output only the image.
```
*Temperature: 0.8 for sprite sheets.*

#### Parallax Backgrounds
```
Match the art style of the reference image. Generate a [LAYER] parallax
background layer for a 2D isometric game. [SCENE DESCRIPTION]. Wide 16:9
landscape format. Rich atmospheric depth, volumetric lighting, vivid colors.
{base style phrase}. Output only the image.
```

### 6.5 Batch Generation Order

1. **Style reference** → Generate 3 test iso floor tiles, pick best, save as `style_ref.png`
2. **Scale reference** → Generate Noah + B3ANS + Walker + crate on a tile grid → `scale_ref.png`
3. **Floor tiles** → All variants with style ref
4. **Wall tiles** → All with style ref
5. **Props** → All with style ref (one per API call)
6. **Character canonical idle (south-facing)** → With style ref. Get user approval. Save as `{character}_canonical.png`
7. **Character remaining directions (SW, W, NW, N)** → One per API call, with canonical idle as reference image
8. **Mirror directions** → SW→SE, W→E, NW→NE (code, not API)
9. **Character animations** → With style ref + canonical idle as reference image
10. **Effects / projectiles** → With style ref
11. **Backgrounds** → Per-biome, with style ref
12. **UI elements** → With style ref

> **Canonical reference workflow:** For every character, the south-facing idle
> sprite is generated first and approved by the user. This becomes the
> "canonical reference" included in ALL subsequent API calls for that character.
> This is the single most important consistency technique.

**Rate limit:** Free tier = ~15 requests/min. Add 4-5 second delay between calls.

---

## 7. Post-Generation Pipeline

Every AI-generated image goes through this pipeline before entering the project.

### 7.1 Processing Steps

```
1. INSPECT       — Does it pass the quality checklist? (Section 10.1)
2. CHROMA KEY    — Remove magenta background → true alpha transparency
3. TRIM          — Crop to content + 8px padding on all sides
4. RESIZE        — Downscale to standardized canvas size (Section 3.4)
                   using NEAREST-NEIGHBOR interpolation only
5. PALETTE SNAP  — (Optional) Quantize to master palette for strict consistency
6. SLICE         — For sprite sheets: split into individual frames, verify uniform size
7. MIRROR        — Generate east/NE/SE directions by horizontal flip
8. SAVE          — Save with correct file name (Section 4.5) to correct directory
9. VERIFY        — Place in test scene next to existing assets, confirm cohesion
```

### 7.2 Chroma Key Script

Python script using Pillow for magenta removal:

```python
from PIL import Image
import numpy as np

def chroma_key_magenta(input_path, output_path, tolerance=60):
    """Remove #FF00FF magenta background, producing true alpha transparency."""
    img = Image.open(input_path).convert('RGBA')
    data = np.array(img)

    r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]

    # Core magenta: high R, low G, high B
    magenta_mask = (r > (255 - tolerance)) & (g < tolerance) & (b > (255 - tolerance))

    # Edge pixels: partial transparency based on distance from pure magenta
    # This handles glow bleeding into the background
    magenta_distance = np.sqrt(
        (r.astype(float) - 255)**2 +
        g.astype(float)**2 +
        (b.astype(float) - 255)**2
    )
    edge_mask = (magenta_distance < tolerance * 2) & ~magenta_mask

    # Pure magenta → fully transparent
    data[magenta_mask] = [0, 0, 0, 0]

    # Edge pixels → partial transparency proportional to magenta distance
    if np.any(edge_mask):
        alpha_values = np.clip(magenta_distance[edge_mask] / (tolerance * 2) * 255, 0, 255)
        data[edge_mask, 3] = alpha_values.astype(np.uint8)
        # Remove magenta spill from edge pixel colors
        data[edge_mask, 1] = np.clip(data[edge_mask, 1].astype(int) + 30, 0, 255).astype(np.uint8)

    result = Image.fromarray(data)
    result.save(output_path)
    return output_path
```

### 7.3 Sprite Sheet Slicer

```python
from PIL import Image

def slice_sprite_sheet(sheet_path, frame_count, output_dir, base_name):
    """Slice a horizontal sprite strip into individual frames."""
    sheet = Image.open(sheet_path)
    frame_width = sheet.width // frame_count
    frame_height = sheet.height

    for i in range(frame_count):
        frame = sheet.crop((i * frame_width, 0, (i+1) * frame_width, frame_height))
        frame.save(f"{output_dir}/{base_name}_f{i:03d}.png")

    return frame_count
```

### 7.4 Direction Mirroring

```python
from PIL import Image

def mirror_direction(input_path, output_path):
    """Horizontally flip a sprite to create the mirrored direction."""
    img = Image.open(input_path)
    mirrored = img.transpose(Image.FLIP_LEFT_RIGHT)
    mirrored.save(output_path)
```

**Mirroring map:**
- `nw` → flip → `ne`
- `w` → flip → `e`
- `sw` → flip → `se`

---

## 8. Godot Import & Rendering

### 8.1 Project Settings

These MUST be set in `project.godot` for pixel art to render correctly:

| Setting | Value | Why |
|---------|-------|-----|
| `rendering/textures/canvas_textures/default_texture_filter` | `0` (Nearest) | Prevents blurry pixel art |
| `rendering/2d/snap/snap_2d_transforms_to_pixel` | `true` | Prevents sub-pixel jitter |
| `rendering/2d/snap/snap_2d_vertices_to_pixel` | `true` | Prevents sub-pixel jitter |
| `display/window/stretch/mode` | `"viewport"` | Clean integer scaling |
| `display/window/size/viewport_width` | `640` | Native resolution |
| `display/window/size/viewport_height` | `360` | Native resolution |
| `display/window/size/window_width_override` | `1280` | 2× scale |
| `display/window/size/window_height_override` | `720` | 2× scale |

### 8.2 Per-Texture Import Settings

Every `.png.import` file should have:

| Setting | Value | Why |
|---------|-------|-----|
| Compress Mode | Lossless | Never lossy for pixel art |
| Filter | Nearest | Override in case default is wrong |
| Mipmaps | Off | Mipmaps blur pixel art at zoom |
| Repeat | Disabled (tiles: Enabled) | Tiles need repeat for seamless |

### 8.3 Z-Sorting (Depth Sorting)

**Godot setup:**
- TileMapLayer: `y_sort_enabled = true`
- Character/prop container: `Node2D` with `y_sort_enabled = true`
- Sorting is based on each node's **Y position at its feet** (not center)

**For Sprite2D:** Use `y_sort_enabled` on the parent and ensure each sprite's `offset` is set so the origin = feet position.

**Overlap tiebreaker:** When two objects share the same Y-sort value, the one further to the **right** renders in front (because our light comes from upper-left, making right-side objects visually closer).

**Multi-tile objects:** Sort based on front-most tile's Y position.

**Elevation:** Different height levels use separate TileMapLayers or Z-index offsets. Ground floor = Z-index 0, raised platform = Z-index 10, etc.

### 8.4 Glow & Emission

**Strategy: Baked glow + optional runtime bloom.**

| Glow type | Implementation |
|-----------|---------------|
| **Baked glow** | Bright pixels with soft halo generated INTO the sprite by the AI. This is the primary glow method. |
| **Additive overlay** | For dynamic glow (energy cores, projectiles, B3ANS eye): separate Sprite2D with `CanvasItem.blend_mode = Add` |
| **Scene bloom** | Optional fullscreen post-processing via WorldEnvironment. Light threshold so only bright pixels bloom. |

**Glow colors follow accent system:** Cyan = friendly, amber = warmth, red = danger, green = health.

### 8.5 Post-Processing Pipeline

Applied via CanvasLayer above the game world:

```
1. Game world renders at 640×360 native
2. (Optional) Bloom shader on a fullscreen ColorRect — subtle, threshold high
3. (Optional) Per-biome color grading via shader uniform
4. (Optional) Vignette — subtle darkening at screen edges
5. Window scales to 1280×720 with Nearest filter
```

**What NOT to do:**
- ❌ Never apply linear interpolation scaling
- ❌ Never use full-screen anti-aliasing
- ❌ Never apply motion blur
- ❌ Never apply glow to UI layer

---

## 9. UI Art Direction

### 9.1 Style

UI elements use the **same pixel art style** as the game world. NOT clean/flat/vector. Same pixel density, same shading approach, same HD pixel art feel.

### 9.2 Layout

- HUD renders on a **separate CanvasLayer** above the game world (z_index: 100)
- UI does NOT receive post-processing effects (no bloom on health bars)
- Icons are 32×32 at native resolution

### 9.3 UI Color Rules

| Element | Style |
|---------|-------|
| Panel background | `#000000` at 60% opacity (dark overlay) |
| Panel border | Accent color (cyan for neutral, amber for selected) |
| Health bar fill | Gradient from green to red based on HP |
| Health bar frame | Sci-fi styled metal frame, matches game art |
| Text | Pixel font (see below), white with 1px dark shadow |

### 9.4 Font

- **In-game HUD text:** Pixel font, ~8px size at native resolution
- **Menu text:** Same pixel font, ~12px for headers
- **Damage numbers:** Same font, colored per damage type

*Specific font: TBD — select a CC0 pixel font from sources like [fonts.google.com](https://fonts.google.com/?classification=Display) or [dafont.com pixel category](https://www.dafont.com/theme.php?cat=501).*

---

## 10. Quality Standards

### 10.1 Pre-Save Checklist

Before saving ANY generated asset:

- [ ] Matches the style reference (`style_ref.png`)
- [ ] Correct isometric angle (2:1 pixel slope, 26.57°)
- [ ] Light from upper-left, shadows to lower-right
- [ ] Top face brightest, left face medium, right face darkest
- [ ] Correct scale relative to scale chart
- [ ] Magenta background is solid (for chroma key assets)
- [ ] No AI artifacts (extra limbs, text gibberish, broken geometry)
- [ ] Color palette matches biome/environment spec
- [ ] Smooth HD gradients (NOT chunky/retro — compare against tree_large_01 quality bar)
- [ ] Would look cohesive next to existing assets
- [ ] Readable at 1280×720 window size

### 10.2 Common AI Issues & Fixes

| Issue | Prompt Fix |
|-------|-----------|
| Wrong iso angle (too steep/flat) | Say "2:1 isometric pixel art perspective" not "30 degrees" |
| Inconsistent style | Always include `style_ref.png` as reference image |
| Text/writing on assets | Add "no text, no writing, no letters, no words" |
| Wrong lighting direction | Reinforce "light from upper-left, shadow lower-right" |
| Wrong aspect ratio | Specify "square 1:1 image" or "wide 16:9" explicitly |
| Sprite sheet frames uneven | Temperature 0.8, "each frame exactly same bounding box" |
| Too retro/chunky | Add "NOT chunky retro 16-bit pixels, smooth color gradients, anti-aliased edges, smooth blending between colors, detailed light falloff and fine pixel work" — this is the #1 consistency issue |
| Too realistic/painterly | Reinforce "pixel art, visible pixel structure" |
| Magenta background has gradient | Reinforce "SOLID uniform #FF00FF, no variation" |

### 10.3 Regeneration Protocol

1. Identify the specific issue
2. Adjust prompt to address that issue
3. Regenerate (max 3 attempts per asset)
4. If 3 attempts fail → flag for manual editing and move on

### 10.4 Acceptance Test

**"The Lineup Test":** Place the new asset in a test scene next to 3+ existing assets. If a player would think they all came from the same artist, it passes. If one looks "off," it fails.

---

## 11. Decision Lock Register

### LOCKED (do not change without full review)

| Decision | Value | Locked Date |
|----------|-------|-------------|
| Art style | Octopath Pixel — HD pixel art + cinematic lighting | 2026-02-11 |
| Perspective | Isometric, 2:1 pixel ratio (26.57°) | 2026-02-11 |
| Light direction | Upper-left, always | 2026-02-11 |
| Generation model | `gemini-3-pro-image-preview` | 2026-02-11 |
| Chroma key color | Magenta `#FF00FF` | 2026-02-11 |
| Tile footprint | 64×32 px (diamond) | 2026-02-11 |
| Height unit | 24 px per story | 2026-02-11 |
| Direction system | 5 generated + 3 mirrored | 2026-02-11 |
| Generation output | 1024×1024 px | 2026-02-11 |
| Downscale method | Nearest-neighbor only | 2026-02-11 |

### PROVISIONAL (still being refined)

| Decision | Current Value | Notes |
|----------|--------------|-------|
| Master color palette | Accent colors defined, full palette TBD | Need Lospec selection or custom build |
| Noah exact colors | Approximate hex values defined | Lock after first approved generation |
| Post-processing stack | Bloom + vignette + color grading | Test in Godot first |
| Pixel font | TBD | Need to select specific font |
| Character height ratio | 1.5 tile-heights | Verify after first in-game placement |
| Canvas sizes after trim | Estimates in 3.4 | Refine after first batch generation |

---

## Appendix A: Reusing This Bible

**Universal sections (reuse as-is):**
- 6.1-6.3 (Generation pipeline, chroma key, reference system)
- 7 (Post-generation pipeline)
- 8 (Godot import settings)
- 10 (Quality standards)

**Project-specific sections (customize):**
- 1.2 (Perspective) — change for top-down, side-scroller
- 1.3-1.4 (Lighting, colors) — change per game mood
- 2 (Game identity) — characters, world
- 3 (Geometry) — tile sizes, scale chart
- 4 (Animation) — frame counts, directions
- 5 (Asset catalog) — specific asset list
- 9 (UI direction) — per-game UI style

---

*Last updated: 2026-02-11*
*Style: Octopath Pixel | Perspective: Isometric 2:1 | Light: Upper-left | Model: gemini-3-pro-image-preview*
