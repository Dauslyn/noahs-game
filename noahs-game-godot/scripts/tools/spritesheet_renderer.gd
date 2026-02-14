## Renders a 3D animated model to 8-direction spritesheet PNGs.
## Run this scene to generate walk/run frames from Mixamo FBX files.
##
## Pipeline: Seek animation pose → wait for render → capture PNG → repeat.
## Uses a state machine so _process() never needs await.
extends Node3D

## Output base path (relative to res://)
@export var output_base: String = "assets/characters/noah"

## Frame size for each captured sprite
@export var frame_size: int = 128

## How many frames to capture per animation
@export var frames_to_capture: int = 12

## Camera distance from model
@export var camera_distance: float = 2.5

## Camera height offset
@export var camera_height: float = 1.0

## Model center height offset (adjust if model isn't centered)
@export var model_center_y: float = 1.0

## Animations to process: {"name": "path/to/file.fbx"}
var animations_to_process := {
	"walk": "res://assets/characters/noah/3D/Walking.fbx",
	"run": "res://assets/characters/noah/3D/Running.fbx",
}

## 8 directions: name -> angle in degrees
## Camera orbits around origin; 0° = camera at south looking north
const DIRECTIONS := {
	"south": 0.0,
	"south-west": 45.0,
	"west": 90.0,
	"north-west": 135.0,
	"north": 180.0,
	"north-east": 225.0,
	"east": 270.0,
	"south-east": 315.0,
}

## States: LOAD_TASK → WAIT → SEEK_FRAME → WAIT → CAPTURE → (repeat)
enum State { LOAD_TASK, WAIT, SEEK_FRAME, CAPTURE, DONE }

var _state: State = State.LOAD_TASK
var _next_state: State = State.LOAD_TASK
var _wait_frames: int = 0

var _camera: Camera3D
var _viewport: SubViewport
var _current_model: Node3D
var _anim_player: AnimationPlayer
var _queue: Array = []
var _current_task: Dictionary = {}
var _current_frame: int = 0
var _anim_length: float = 0.0
var _last_fbx_path: String = ""
var _anim_name_key: String = ""


func _ready() -> void:
	_setup_viewport()
	_setup_camera()
	_setup_lighting()
	_build_queue()
	_state = State.LOAD_TASK
	print("Spritesheet Renderer: %d tasks queued" % _queue.size())


func _setup_viewport() -> void:
	_viewport = SubViewport.new()
	_viewport.size = Vector2i(frame_size, frame_size)
	_viewport.transparent_bg = true
	_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_viewport.own_world_3d = true
	add_child(_viewport)


func _setup_camera() -> void:
	_camera = Camera3D.new()
	_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_camera.size = 2.2
	_camera.near = 0.1
	_camera.far = 100.0
	_viewport.add_child(_camera)


## Add lighting so the 3D model is actually visible.
func _setup_lighting() -> void:
	# Key light from above-front
	var key_light := DirectionalLight3D.new()
	key_light.rotation_degrees = Vector3(-45, -30, 0)
	key_light.light_energy = 1.2
	key_light.shadow_enabled = false
	_viewport.add_child(key_light)

	# Fill light from opposite side (softer)
	var fill_light := DirectionalLight3D.new()
	fill_light.rotation_degrees = Vector3(-30, 150, 0)
	fill_light.light_energy = 0.5
	fill_light.shadow_enabled = false
	_viewport.add_child(fill_light)

	# Set up environment with ambient light
	var env := Environment.new()
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.5, 0.5, 0.55)
	env.ambient_light_energy = 0.6
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0, 0, 0, 0)

	var world_env := WorldEnvironment.new()
	world_env.environment = env
	_viewport.add_child(world_env)


## Build the full queue of render tasks.
func _build_queue() -> void:
	for anim_name in animations_to_process:
		for dir_name in DIRECTIONS:
			_queue.append({
				"anim_name": anim_name,
				"fbx_path": animations_to_process[anim_name],
				"direction": dir_name,
				"angle": DIRECTIONS[dir_name],
			})


## Transition to WAIT state, then proceed to next_state after N frames.
func _wait_then(frames: int, next: State) -> void:
	_wait_frames = frames
	_next_state = next
	_state = State.WAIT


func _process(_delta: float) -> void:
	match _state:
		State.LOAD_TASK:
			_load_next_task()
		State.WAIT:
			_wait_frames -= 1
			if _wait_frames <= 0:
				_state = _next_state
		State.SEEK_FRAME:
			_seek_current_frame()
		State.CAPTURE:
			_capture_and_save()
		State.DONE:
			pass


## Pop next task from queue, load model + position camera.
func _load_next_task() -> void:
	if _queue.is_empty():
		print("Spritesheet Renderer: ALL DONE!")
		_state = State.DONE
		get_tree().quit()
		return

	_current_task = _queue.pop_front()
	_current_frame = 0
	var fbx_path: String = _current_task["fbx_path"]

	# Only reload model if FBX file changed
	if fbx_path != _last_fbx_path:
		_load_model(fbx_path)
		_last_fbx_path = fbx_path

	# Position camera for this direction angle
	var angle_rad: float = deg_to_rad(_current_task["angle"])
	var cam_x: float = sin(angle_rad) * camera_distance
	var cam_z: float = cos(angle_rad) * camera_distance
	_camera.position = Vector3(cam_x, camera_height, cam_z)
	_camera.look_at(Vector3(0.0, model_center_y, 0.0))

	print("  Rendering: %s / %s" % [
		_current_task["anim_name"], _current_task["direction"]
	])

	# Wait 5 frames for viewport to settle, then start capturing
	_wait_then(5, State.SEEK_FRAME)


## Load a 3D model from FBX path into the viewport.
func _load_model(fbx_path: String) -> void:
	if _current_model:
		_current_model.queue_free()
		_current_model = null
		_anim_player = null
		_anim_name_key = ""

	var scene := load(fbx_path) as PackedScene
	if not scene:
		print("  ERROR: Could not load %s" % fbx_path)
		return

	_current_model = scene.instantiate() as Node3D
	_viewport.add_child(_current_model)

	# Find AnimationPlayer in the scene tree
	_anim_player = _find_animation_player(_current_model)
	if not _anim_player:
		print("  WARNING: No AnimationPlayer found in %s" % fbx_path)
		return

	# Discover and select the animation to use
	var anim_list := _anim_player.get_animation_list()
	print("  Found animations: %s" % str(anim_list))

	if anim_list.size() == 0:
		print("  WARNING: No animations available!")
		return

	# Pick first non-RESET animation
	_anim_name_key = ""
	for aname in anim_list:
		if aname != "RESET":
			_anim_name_key = aname
			break
	if _anim_name_key.is_empty():
		_anim_name_key = anim_list[0]

	var anim := _anim_player.get_animation(_anim_name_key)
	_anim_length = anim.length
	print("  Animation: '%s' (%.3fs)" % [_anim_name_key, _anim_length])

	# Strip root motion from the hips position track.
	# Mixamo walks move the Hips bone forward in Z — we zero out
	# X and Z so the model stays at center for rendering.
	_strip_root_motion(anim)


## Recursively find AnimationPlayer in node tree.
func _find_animation_player(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node as AnimationPlayer
	for child in node.get_children():
		var result := _find_animation_player(child)
		if result:
			return result
	return null


## Remove root motion from a Mixamo animation.
## Finds the Hips position track and zeroes out X/Z on every key,
## keeping only Y (vertical bob). This prevents the model from
## walking out of the camera frame during rendering.
func _strip_root_motion(anim: Animation) -> void:
	for i in range(anim.get_track_count()):
		if anim.track_get_type(i) != Animation.TYPE_POSITION_3D:
			continue
		var path := str(anim.track_get_path(i))
		# Only strip the Hips bone (root motion bone in Mixamo)
		if "Hips" not in path:
			continue
		var key_count := anim.track_get_key_count(i)
		print("  Stripping root motion: track '%s' (%d keys)" % [path, key_count])
		for k in range(key_count):
			var pos := anim.track_get_key_value(i, k) as Vector3
			# Keep Y (height bob), zero X and Z (forward/lateral motion)
			pos.x = 0.0
			pos.z = 0.0
			anim.track_set_key_value(i, k, pos)
		break  # Only one Hips track


## Seek to the current frame's time in the animation.
func _seek_current_frame() -> void:
	if _current_frame >= frames_to_capture:
		# All frames captured for this direction
		_state = State.LOAD_TASK
		return

	# Calculate time for this frame (evenly spaced across one loop)
	var t: float = (float(_current_frame) / float(frames_to_capture)) * _anim_length
	if _anim_player and not _anim_name_key.is_empty():
		_anim_player.play(_anim_name_key)
		_anim_player.seek(t, true)

	# Wait 2 frames for the viewport to render the new pose
	_wait_then(2, State.CAPTURE)


## Capture the viewport and save as PNG.
func _capture_and_save() -> void:
	var img := _viewport.get_texture().get_image()
	if not img:
		print("  WARNING: No viewport image for frame %d" % _current_frame)
		_current_frame += 1
		_state = State.SEEK_FRAME
		return

	# Build absolute output path
	var anim_name: String = _current_task["anim_name"]
	var dir_name: String = _current_task["direction"]
	var project_path: String = ProjectSettings.globalize_path("res://")
	var out_dir := project_path + "%s/%s/%s" % [output_base, anim_name, dir_name]
	var out_path := "%s/frame_%03d.png" % [out_dir, _current_frame]

	DirAccess.make_dir_recursive_absolute(out_dir)

	var err := img.save_png(out_path)
	if err != OK:
		print("  ERROR saving frame %d: %s" % [_current_frame, error_string(err)])
	elif _current_frame == 0:
		print("    → %s" % out_dir)

	_current_frame += 1
	# Go back to seek the next frame
	_state = State.SEEK_FRAME
