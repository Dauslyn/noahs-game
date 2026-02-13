## Test room level script.
## Sets up the room with PixelLab tilesets and decoration sprites.
extends Node2D

## Room dimensions in tiles (32px each).
const ROOM_COLS := 20
const ROOM_ROWS := 12

## Decoration sprite data: {name, position, texture_path}
const DECORATIONS := [
	{"pos": Vector2(64, 32), "tex": "res://assets/tiles/decorations/crate.png"},
	{"pos": Vector2(96, 32), "tex": "res://assets/tiles/decorations/crate.png"},
	{"pos": Vector2(544, 64), "tex": "res://assets/tiles/decorations/console.png"},
	{"pos": Vector2(480, 320), "tex": "res://assets/tiles/decorations/energy_core.png"},
	{"pos": Vector2(160, 288), "tex": "res://assets/tiles/decorations/pipe.png"},
	{"pos": Vector2(320, 32), "tex": "res://assets/tiles/decorations/vent_grate.png"},
]


func _ready() -> void:
	GameState.enemies_killed = 0
	GameState.run_start_time = Time.get_ticks_msec() / 1000.0
	_build_floor()
	_place_wall_sprites()
	_place_decorations()
	_add_ambient_lights()


## Build the floor TileMapLayer from the PixelLab tileset.
func _build_floor() -> void:
	var tileset := RoomBuilder.create_floor_tileset(
		"res://assets/tiles/floor/tileset1_image.png"
	)
	if not tileset:
		return

	# Create floor TileMapLayer
	var floor_layer := TileMapLayer.new()
	floor_layer.name = "FloorTiles"
	floor_layer.tile_set = tileset
	floor_layer.z_index = -10  # Below everything
	add_child(floor_layer)
	move_child(floor_layer, 0)  # First child = drawn first

	# Paint the main floor area with dark metal (terrain 0)
	var room_rect := Rect2i(0, 0, ROOM_COLS, ROOM_ROWS)
	RoomBuilder.paint_floor_rect(floor_layer, room_rect, 0)

	# Paint accent panels of light metal (terrain 1) in center area
	var center_rect := Rect2i(4, 3, 12, 6)
	RoomBuilder.paint_floor_rect(floor_layer, center_rect, 1)

	# Small accent patches in corners
	var patch1 := Rect2i(1, 1, 3, 2)
	RoomBuilder.paint_floor_rect(floor_layer, patch1, 1)
	var patch2 := Rect2i(16, 1, 3, 2)
	RoomBuilder.paint_floor_rect(floor_layer, patch2, 1)


## Place wall block sprites along the room perimeter.
func _place_wall_sprites() -> void:
	var wall_tex_path := "res://assets/tiles/decorations/steel_wall.png"
	var dmg_tex_path := "res://assets/tiles/decorations/damaged_wall.png"
	if not ResourceLoader.exists(wall_tex_path):
		return
	var wall_tex: Texture2D = load(wall_tex_path)
	var dmg_tex: Texture2D = null
	if ResourceLoader.exists(dmg_tex_path):
		dmg_tex = load(dmg_tex_path)

	# Place walls along top edge
	for i in range(ROOM_COLS):
		var spr := Sprite2D.new()
		# Occasionally use damaged wall for variety
		if dmg_tex and (i == 5 or i == 14):
			spr.texture = dmg_tex
		else:
			spr.texture = wall_tex
		spr.position = Vector2(i * 32 + 16, -8)
		spr.z_index = 10
		add_child(spr)

	# Place walls along bottom edge
	for i in range(ROOM_COLS):
		var spr := Sprite2D.new()
		spr.texture = wall_tex
		spr.position = Vector2(i * 32 + 16, ROOM_ROWS * 32 + 8)
		spr.z_index = 10
		add_child(spr)

	# Place walls along left and right edges
	for j in range(ROOM_ROWS):
		var left := Sprite2D.new()
		left.texture = wall_tex
		left.position = Vector2(-8, j * 32 + 16)
		left.z_index = 10
		add_child(left)

		var right := Sprite2D.new()
		right.texture = wall_tex
		right.position = Vector2(ROOM_COLS * 32 + 8, j * 32 + 16)
		right.z_index = 10
		add_child(right)


## Place isometric decoration sprites in the room.
func _place_decorations() -> void:
	for deco in DECORATIONS:
		if not ResourceLoader.exists(deco.tex):
			continue
		var tex: Texture2D = load(deco.tex)
		if not tex:
			continue
		var spr := Sprite2D.new()
		spr.texture = tex
		spr.position = deco.pos
		spr.z_index = 1  # Above floor
		add_child(spr)


## Add subtle ambient colored point lights.
func _add_ambient_lights() -> void:
	# Teal ambient fill light in center
	var center_light := PointLight2D.new()
	center_light.position = Vector2(320, 180)
	center_light.color = Color(0.2, 0.5, 0.7, 0.3)
	center_light.energy = 0.4
	center_light.texture = _create_light_texture()
	center_light.texture_scale = 12.0
	add_child(center_light)

	# Warm accent near energy core
	var warm_light := PointLight2D.new()
	warm_light.position = Vector2(480, 320)
	warm_light.color = Color(0.3, 0.8, 0.9, 0.4)
	warm_light.energy = 0.6
	warm_light.texture = _create_light_texture()
	warm_light.texture_scale = 4.0
	add_child(warm_light)


## Create a simple radial gradient texture for point lights.
func _create_light_texture() -> ImageTexture:
	var size := 64
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var center := size / 2.0
	for y in range(size):
		for x in range(size):
			var dx := x - center
			var dy := y - center
			var dist := sqrt(dx * dx + dy * dy) / center
			var alpha := clampf(1.0 - dist, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, alpha))
	return ImageTexture.create_from_image(img)
