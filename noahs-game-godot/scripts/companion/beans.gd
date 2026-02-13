## B3ANS companion AI.
## Auto-targets nearest enemy, auto-fires, follows Noah.
extends CharacterBody2D

## How fast B3ANS moves to follow Noah.
@export var follow_speed: float = 140.0

## Ideal orbit distance from Noah in pixels.
@export var orbit_distance: float = 40.0

## Fire rate: seconds between shots.
@export var fire_cooldown: float = 0.5

## Detection radius for enemies in pixels.
@export var detect_range: float = 200.0

## Projectile speed.
@export var projectile_speed: float = 250.0

## Projectile damage.
@export var projectile_damage: int = 10

## Bob amplitude (floating effect).
@export var bob_amplitude: float = 3.0

## Bob speed.
@export var bob_speed: float = 3.0

## Internal state
var _fire_timer: float = 0.0
var _bob_time: float = 0.0
var _current_target: Node2D = null

## Packed scene for projectile (set in _ready or exported)
var _projectile_scene: PackedScene = null

## Reference to the player node.
var player: CharacterBody2D = null

## Fire sound.
var _fire_sound: AudioStreamPlayer2D = null

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D


func _ready() -> void:
	# Find the player in the scene tree
	player = get_tree().get_first_node_in_group("player") as CharacterBody2D

	# Preload projectile scene
	if ResourceLoader.exists("res://scenes/companion/projectile.tscn"):
		_projectile_scene = load("res://scenes/companion/projectile.tscn")

	_load_sprites()
	_setup_fire_sound()


func _physics_process(delta: float) -> void:
	if not player:
		return

	_follow_player(delta)
	_bob_float(delta)
	_update_targeting()
	_update_firing(delta)
	_update_sprite_direction()

	move_and_slide()


## Load B3ANS sprites or create teal placeholder.
func _load_sprites() -> void:
	var rot_path := "res://assets/characters/beans/idle"
	if ResourceLoader.exists(rot_path + "/beans-idle-s.png"):
		var frames := SpriteLoader.load_rotations(rot_path, "beans-idle")
		sprite.sprite_frames = frames
		sprite.play("static_south")
	else:
		# Teal circle placeholder for the orbiting mech
		var img := Image.create(12, 12, false, Image.FORMAT_RGBA8)
		for y in range(12):
			for x in range(12):
				var dx := x - 6
				var dy := y - 6
				if dx * dx + dy * dy <= 25:  # radius 5
					img.set_pixel(x, y, Color(0.2, 0.85, 0.85))
		var tex := ImageTexture.create_from_image(img)
		var frames := SpriteFrames.new()
		if frames.has_animation("default"):
			frames.remove_animation("default")
		frames.add_animation("idle")
		frames.add_frame("idle", tex)
		sprite.sprite_frames = frames
		sprite.play("idle")


## Follow Noah, positioning between him and the nearest threat.
func _follow_player(delta: float) -> void:
	var target_pos: Vector2

	if _current_target and is_instance_valid(_current_target):
		# Bodyguard: position between Noah and the threat
		var threat_dir := (_current_target.global_position - player.global_position).normalized()
		target_pos = player.global_position + threat_dir * orbit_distance
	else:
		# No threat: orbit slightly behind Noah
		var behind := -player.velocity.normalized() if player.velocity.length_squared() > 10 else Vector2.DOWN
		target_pos = player.global_position + behind * orbit_distance

	var to_target := target_pos - global_position
	var dist := to_target.length()

	if dist > 4.0:
		velocity = to_target.normalized() * min(follow_speed, dist * 5.0)
	else:
		velocity = Vector2.ZERO


## Gentle floating bob effect.
func _bob_float(delta: float) -> void:
	_bob_time += delta * bob_speed
	if sprite:
		sprite.position.y = sin(_bob_time) * bob_amplitude


## Find the nearest enemy within detection range.
func _update_targeting() -> void:
	var enemies := get_tree().get_nodes_in_group("enemies")
	var closest_dist := detect_range * detect_range
	_current_target = null

	for enemy in enemies:
		if not is_instance_valid(enemy) or not enemy is Node2D:
			continue
		var dist_sq := global_position.distance_squared_to(enemy.global_position)
		if dist_sq < closest_dist:
			closest_dist = dist_sq
			_current_target = enemy as Node2D


## Fire projectiles at the current target.
func _update_firing(delta: float) -> void:
	_fire_timer -= delta

	if _fire_timer > 0.0:
		return

	if not _current_target or not is_instance_valid(_current_target):
		return

	_fire_timer = fire_cooldown
	_fire_projectile()


## Spawn a projectile aimed at the current target.
func _fire_projectile() -> void:
	if not _current_target:
		return

	if _projectile_scene:
		var proj := _projectile_scene.instantiate() as Node2D
		proj.global_position = global_position
		var dir := (
			_current_target.global_position - global_position
		).normalized()
		if proj.has_method("setup"):
			proj.setup(dir, projectile_speed, projectile_damage)
		get_tree().current_scene.add_child(proj)
		if _fire_sound and _fire_sound.stream:
			_fire_sound.play()
	else:
		# Fallback: direct damage (no projectile scene yet)
		if _current_target.has_method("take_damage"):
			_current_target.take_damage(projectile_damage)


## Face toward target or movement direction.
func _update_sprite_direction() -> void:
	if not sprite:
		return

	var look_at_pos: Vector2
	if _current_target and is_instance_valid(_current_target):
		look_at_pos = _current_target.global_position
	elif player:
		look_at_pos = player.global_position
	else:
		return

	# Simple left/right flip based on relative position
	var diff := look_at_pos.x - global_position.x
	if abs(diff) > 2.0:
		sprite.flip_h = diff < 0


## Set up the fire sound effect.
func _setup_fire_sound() -> void:
	_fire_sound = AudioStreamPlayer2D.new()
	add_child(_fire_sound)
	var path := "res://assets/sounds/laser3.mp3"
	if ResourceLoader.exists(path):
		_fire_sound.stream = load(path)
	_fire_sound.volume_db = -6.0  # Slightly quieter than player sounds
