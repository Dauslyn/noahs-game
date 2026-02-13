## Player visual and audio effects helper.
## Manages dash trail particles, sound effects, damage flash.
class_name PlayerEffects


## Configure GPUParticles2D for a blue afterimage dash trail.
static func setup_dash_particles(trail: GPUParticles2D) -> void:
	if not trail:
		return
	var mat := ParticleProcessMaterial.new()
	mat.direction = Vector3(0, 0, 0)
	mat.spread = 15.0
	mat.initial_velocity_min = 10.0
	mat.initial_velocity_max = 30.0
	mat.gravity = Vector3.ZERO
	mat.scale_min = 0.8
	mat.scale_max = 1.2
	# Fade from blue-white to transparent
	mat.color = Color(0.4, 0.7, 1.0, 0.8)
	var color_ramp := GradientTexture1D.new()
	var gradient := Gradient.new()
	gradient.set_color(0, Color(0.5, 0.8, 1.0, 0.9))
	gradient.set_color(1, Color(0.2, 0.4, 0.8, 0.0))
	color_ramp.gradient = gradient
	mat.color_ramp = color_ramp
	trail.process_material = mat


## Load sound effects into AudioStreamPlayer2D nodes.
## Uses Kenney Digital SFX pack file names.
static func load_sounds(
	dash_player: AudioStreamPlayer2D,
	hit_player: AudioStreamPlayer2D
) -> void:
	# phaseJump1 = short whoosh, good for dash
	var dash_path := "res://assets/sounds/phaseJump1.mp3"
	if dash_player and ResourceLoader.exists(dash_path):
		dash_player.stream = load(dash_path)
	# pepSound1 = short impact, good for getting hit
	var hit_path := "res://assets/sounds/pepSound1.mp3"
	if hit_player and ResourceLoader.exists(hit_path):
		hit_player.stream = load(hit_path)


## Create a blue circle placeholder sprite for when no art is loaded.
static func create_placeholder_circle(
	size: int, color: Color
) -> ImageTexture:
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var half := size / 2
	var radius_sq := (half - 1) * (half - 1)
	for y in range(size):
		for x in range(size):
			var dx := x - half
			var dy := y - half
			if dx * dx + dy * dy <= radius_sq:
				img.set_pixel(x, y, color)
	return ImageTexture.create_from_image(img)
