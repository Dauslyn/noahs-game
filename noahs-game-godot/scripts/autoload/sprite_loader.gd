## Loads character rotations and animations into SpriteFrames at runtime.
## Call from _ready() to set up AnimatedSprite2D nodes.
class_name SpriteLoader


## Direction names used in animation names (underscored).
const DIRECTIONS := [
	"south", "south_west", "west", "north_west",
	"north", "north_east", "east", "south_east"
]

## Short direction codes used in Ludo/Gemini filenames (e.g. noah-idle-sw.png).
const DIR_SHORT_MAP := {
	"south": "s",
	"south_west": "sw",
	"west": "w",
	"north_west": "nw",
	"north": "n",
	"north_east": "ne",
	"east": "e",
	"south_east": "se",
}

## Hyphenated direction names for legacy PixelLab filenames (e.g. south-west.png).
const DIR_FILE_MAP := {
	"south": "south",
	"south_west": "south-west",
	"west": "west",
	"north_west": "north-west",
	"north": "north",
	"north_east": "north-east",
	"east": "east",
	"south_east": "south-east",
}


## Build SpriteFrames from rotation PNGs in a directory.
## Creates "static_south", "static_east", etc. animations (single-frame each).
## Supports two naming conventions:
##   - Ludo/Gemini: "{prefix}-{s,sw,w,nw,n,ne,e,se}.png" (e.g. noah-idle-sw.png)
##   - Legacy: "{south,south-west,...}.png" (e.g. south-west.png)
## base_path: directory containing the PNGs
## file_prefix: optional prefix for Ludo-style names (e.g. "noah-idle")
static func load_rotations(base_path: String, file_prefix: String = "") -> SpriteFrames:
	var frames := SpriteFrames.new()
	# Remove the default "default" animation
	if frames.has_animation("default"):
		frames.remove_animation("default")

	for dir_name in DIRECTIONS:
		var texture: Texture2D = null

		# Try Ludo/Gemini naming first: prefix-direction.png
		if file_prefix != "":
			var short_dir: String = DIR_SHORT_MAP[dir_name]
			var path := base_path + "/" + file_prefix + "-" + short_dir + ".png"
			if ResourceLoader.exists(path):
				texture = load(path) as Texture2D

		# Fall back to legacy naming: direction.png
		if not texture:
			var file_name: String = DIR_FILE_MAP[dir_name]
			var path := base_path + "/" + file_name + ".png"
			if ResourceLoader.exists(path):
				texture = load(path) as Texture2D

		if not texture:
			continue

		var anim_name: String = "static_" + dir_name
		frames.add_animation(anim_name)
		frames.set_animation_speed(anim_name, 1.0)
		frames.set_animation_loop(anim_name, false)
		frames.add_frame(anim_name, texture)

	return frames


## Load walk animation spritesheets from PixelLab output.
## anim_dir: e.g. "res://assets/characters/noah/animations"
## anim_prefix: e.g. "walking" (matches PixelLab animation name)
## existing_frames: SpriteFrames to add animations to
## fps: playback speed
static func load_animation_strips(
	anim_dir: String,
	anim_prefix: String,
	gdscript_prefix: String,
	existing_frames: SpriteFrames,
	fps: float = 8.0
) -> void:
	for dir_name in DIRECTIONS:
		var file_name: String = DIR_FILE_MAP[dir_name]
		# PixelLab animation files: walking_south.png, walking_south-west.png, etc.
		var path := anim_dir + "/" + anim_prefix + "_" + file_name + ".png"

		if not ResourceLoader.exists(path):
			continue

		var texture := load(path) as Texture2D
		if not texture:
			continue

		var anim_name: String = gdscript_prefix + "_" + dir_name

		if not existing_frames.has_animation(anim_name):
			existing_frames.add_animation(anim_name)

		existing_frames.set_animation_speed(anim_name, fps)
		existing_frames.set_animation_loop(anim_name, true)

		# PixelLab outputs spritesheets as horizontal strips
		# We need to split them into individual frames
		var img := texture.get_image()
		var frame_height := img.get_height()
		var frame_width := frame_height  # Assume square frames (48x48 or 32x32)
		var frame_count := img.get_width() / frame_width

		for i in range(frame_count):
			var region := Rect2i(i * frame_width, 0, frame_width, frame_height)
			var frame_img := img.get_region(region)
			var frame_tex := ImageTexture.create_from_image(frame_img)
			existing_frames.add_frame(anim_name, frame_tex)


## Load animation from individual frame PNGs in subdirectories.
## frame_dir: e.g. "res://assets/characters/noah/walk"
## Contains subdirs per direction: south/, south-west/, etc. with frame_000.png, etc.
static func load_animation_frames(
	frame_dir: String,
	gdscript_prefix: String,
	existing_frames: SpriteFrames,
	fps: float = 8.0
) -> void:
	for dir_name in DIRECTIONS:
		var file_name: String = DIR_FILE_MAP[dir_name]
		var anim_name: String = gdscript_prefix + "_" + dir_name

		# Check if first frame exists
		var first_frame_path := frame_dir + "/" + file_name + "/frame_000.png"
		if not ResourceLoader.exists(first_frame_path):
			continue

		if not existing_frames.has_animation(anim_name):
			existing_frames.add_animation(anim_name)
		existing_frames.set_animation_speed(anim_name, fps)
		existing_frames.set_animation_loop(anim_name, true)

		# Load all frames in sequence
		var frame_idx := 0
		while true:
			var path := frame_dir + "/" + file_name + "/frame_%03d.png" % frame_idx
			if not ResourceLoader.exists(path):
				break
			var tex := load(path) as Texture2D
			if tex:
				existing_frames.add_frame(anim_name, tex)
			frame_idx += 1
