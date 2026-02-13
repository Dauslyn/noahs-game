## Builds the test room floor and wall layout at runtime.
## Uses the PixelLab-generated tileset PNG as an atlas source.
class_name RoomBuilder

## Wang tile corner index: NW*8 + NE*4 + SW*2 + SE
## Maps wang_index → atlas position (col, row) in the 4×4 PNG
## Derived from tileset1_metadata.json bounding_box coordinates
const WANG_TO_ATLAS := {
	13: Vector2i(0, 0),  # NW=1 NE=1 SW=0 SE=1
	10: Vector2i(1, 0),  # NW=1 NE=0 SW=1 SE=0
	4:  Vector2i(2, 0),  # NW=0 NE=1 SW=0 SE=0
	12: Vector2i(3, 0),  # NW=1 NE=1 SW=0 SE=0
	6:  Vector2i(0, 1),  # NW=0 NE=1 SW=1 SE=0
	8:  Vector2i(1, 1),  # NW=1 NE=0 SW=0 SE=0
	0:  Vector2i(2, 1),  # NW=0 NE=0 SW=0 SE=0 (all lower)
	1:  Vector2i(3, 1),  # NW=0 NE=0 SW=0 SE=1
	11: Vector2i(0, 2),  # NW=1 NE=0 SW=1 SE=1
	3:  Vector2i(1, 2),  # NW=0 NE=0 SW=1 SE=1
	2:  Vector2i(2, 2),  # NW=0 NE=0 SW=1 SE=0
	5:  Vector2i(3, 2),  # NW=0 NE=1 SW=0 SE=1
	15: Vector2i(0, 3),  # NW=1 NE=1 SW=1 SE=1 (all upper)
	14: Vector2i(1, 3),  # NW=1 NE=1 SW=1 SE=0
	9:  Vector2i(2, 3),  # NW=1 NE=0 SW=0 SE=1
	7:  Vector2i(3, 3),  # NW=0 NE=1 SW=1 SE=1
}


## Create a TileSet from the tileset PNG atlas.
static func create_floor_tileset(atlas_path: String) -> TileSet:
	var tileset := TileSet.new()
	tileset.tile_size = Vector2i(32, 32)

	# Add terrain set (mode 0 = match corners)
	tileset.add_terrain_set(0)
	tileset.set_terrain_set_mode(0, TileSet.TERRAIN_MODE_MATCH_CORNERS)
	tileset.add_terrain(0, 0)  # terrain 0 = dark metal (lower)
	tileset.set_terrain_name(0, 0, "dark_metal")
	tileset.set_terrain_color(0, 0, Color(0.12, 0.15, 0.22))
	tileset.add_terrain(0, 1)  # terrain 1 = light metal (upper)
	tileset.set_terrain_name(0, 1, "light_metal")
	tileset.set_terrain_color(0, 1, Color(0.3, 0.4, 0.55))

	# Load atlas texture
	var texture: Texture2D = null
	if ResourceLoader.exists(atlas_path):
		texture = load(atlas_path)
	if not texture:
		push_warning("RoomBuilder: Atlas texture not found at %s" % atlas_path)
		return tileset

	# Create atlas source from the 4×4 tile grid
	var source := TileSetAtlasSource.new()
	source.texture = texture
	source.texture_region_size = Vector2i(32, 32)

	# Create tiles and set terrain peering bits
	for wang_idx in WANG_TO_ATLAS:
		var atlas_pos: Vector2i = WANG_TO_ATLAS[wang_idx]
		source.create_tile(atlas_pos)
		var tile_data := source.get_tile_data(atlas_pos, 0)
		tile_data.terrain_set = 0

		# Decode wang index back to corner terrains
		# wang_idx = NW*8 + NE*4 + SW*2 + SE
		var nw: int = (wang_idx >> 3) & 1
		var ne: int = (wang_idx >> 2) & 1
		var sw: int = (wang_idx >> 1) & 1
		var se: int = wang_idx & 1
		tile_data.set_terrain_peering_bit(
			TileSet.CELL_NEIGHBOR_TOP_LEFT_CORNER, nw
		)
		tile_data.set_terrain_peering_bit(
			TileSet.CELL_NEIGHBOR_TOP_RIGHT_CORNER, ne
		)
		tile_data.set_terrain_peering_bit(
			TileSet.CELL_NEIGHBOR_BOTTOM_LEFT_CORNER, sw
		)
		tile_data.set_terrain_peering_bit(
			TileSet.CELL_NEIGHBOR_BOTTOM_RIGHT_CORNER, se
		)

	var source_id := tileset.add_source(source)
	return tileset


## Paint a rectangular floor area on a TileMapLayer using terrain.
## Uses terrain painting for natural transitions.
static func paint_floor_rect(
	tilemap: TileMapLayer,
	rect: Rect2i,
	terrain_id: int
) -> void:
	var cells: Array[Vector2i] = []
	for y in range(rect.position.y, rect.position.y + rect.size.y):
		for x in range(rect.position.x, rect.position.x + rect.size.x):
			cells.append(Vector2i(x, y))
	tilemap.set_cells_terrain_connect(cells, 0, terrain_id)


## Paint a border of wall tiles around a region.
static func paint_wall_border(
	tilemap: TileMapLayer,
	rect: Rect2i,
	source_id: int,
	atlas_coord: Vector2i
) -> void:
	# Top and bottom walls
	for x in range(rect.position.x, rect.position.x + rect.size.x):
		tilemap.set_cell(
			Vector2i(x, rect.position.y),
			source_id, atlas_coord
		)
		tilemap.set_cell(
			Vector2i(x, rect.position.y + rect.size.y - 1),
			source_id, atlas_coord
		)
	# Left and right walls
	for y in range(rect.position.y, rect.position.y + rect.size.y):
		tilemap.set_cell(
			Vector2i(rect.position.x, y),
			source_id, atlas_coord
		)
		tilemap.set_cell(
			Vector2i(rect.position.x + rect.size.x - 1, y),
			source_id, atlas_coord
		)
