## Walker enemy: basic melee chaser.
## Patrols until player is nearby, then chases and deals contact damage.
extends CharacterBody2D

## Movement speed during patrol.
@export var patrol_speed: float = 40.0

## Movement speed when chasing.
@export var chase_speed: float = 70.0

## Detection radius to start chasing.
@export var detect_range: float = 150.0

## Distance to deal contact damage.
@export var attack_range: float = 20.0

## Damage dealt on contact.
@export var contact_damage: int = 15

## Time between contact damage ticks.
@export var attack_cooldown: float = 0.8

## Health points.
@export var max_hp: int = 40

## Scrap dropped on death.
@export var scrap_value: int = 10

var hp: int = 40
var _state: String = "patrol"  # patrol, chase, attack
var _attack_timer: float = 0.0
var _patrol_direction: Vector2 = Vector2.RIGHT
var _patrol_timer: float = 0.0
var _player: Node2D = null

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D


func _ready() -> void:
	hp = max_hp
	add_to_group("enemies")
	_pick_random_patrol_direction()
	_player = get_tree().get_first_node_in_group("player")
	_load_sprites()


func _physics_process(delta: float) -> void:
	if not _player or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player")
		if not _player:
			return

	var dist_to_player := global_position.distance_to(_player.global_position)

	# State transitions
	match _state:
		"patrol":
			if dist_to_player < detect_range:
				_state = "chase"
		"chase":
			if dist_to_player > detect_range * 1.5:
				_state = "patrol"
				_pick_random_patrol_direction()
			elif dist_to_player < attack_range:
				_state = "attack"
		"attack":
			if dist_to_player > attack_range * 2.0:
				_state = "chase"

	# Behavior
	match _state:
		"patrol":
			_do_patrol(delta)
		"chase":
			_do_chase()
		"attack":
			_do_attack(delta)

	_attack_timer -= delta
	move_and_slide()
	_update_sprite()


## Wander in a random direction, changing periodically.
func _do_patrol(delta: float) -> void:
	_patrol_timer -= delta
	if _patrol_timer <= 0:
		_pick_random_patrol_direction()
	velocity = _patrol_direction * patrol_speed


## Move directly toward the player.
func _do_chase() -> void:
	var dir := (_player.global_position - global_position).normalized()
	velocity = dir * chase_speed


## Stop and deal contact damage on a timer.
func _do_attack(delta: float) -> void:
	velocity = Vector2.ZERO

	if _attack_timer <= 0.0:
		_attack_timer = attack_cooldown
		if _player.has_method("take_damage"):
			_player.take_damage(contact_damage)


## Pick a new random patrol direction and reset timer.
func _pick_random_patrol_direction() -> void:
	var angle := randf() * TAU
	_patrol_direction = Vector2(cos(angle), sin(angle))
	_patrol_timer = randf_range(1.5, 3.0)


## Load walker sprites or fall back to placeholder.
func _load_sprites() -> void:
	var rot_path := "res://assets/enemies/walker/idle"
	var anim_path := "res://assets/enemies/walker/walk"
	var has_rotations := ResourceLoader.exists(rot_path + "/walker-idle-s.png")

	if has_rotations:
		var frames := SpriteLoader.load_rotations(rot_path, "walker-idle")
		# Load walk animations if available
		SpriteLoader.load_animation_frames(anim_path, "walk", frames, 8.0)
		sprite.sprite_frames = frames
		if frames.has_animation("static_south"):
			sprite.play("static_south")
		elif frames.get_animation_names().size() > 0:
			sprite.play(frames.get_animation_names()[0])
	else:
		# Red circle placeholder
		var tex := PlayerEffects.create_placeholder_circle(16, Color(0.9, 0.2, 0.2))
		var frames := SpriteFrames.new()
		if frames.has_animation("default"):
			frames.remove_animation("default")
		frames.add_animation("idle")
		frames.add_frame("idle", tex)
		sprite.sprite_frames = frames
		sprite.play("idle")


## Update sprite animation based on velocity direction.
func _update_sprite() -> void:
	if not sprite or not sprite.sprite_frames:
		return

	var dir_name := _velocity_to_direction()
	var walk_anim: String = "walk_" + dir_name
	var static_anim: String = "static_" + dir_name

	if velocity.length_squared() > 10.0:
		if sprite.sprite_frames.has_animation(walk_anim):
			if sprite.animation != walk_anim:
				sprite.play(walk_anim)
		elif sprite.sprite_frames.has_animation(static_anim):
			if sprite.animation != static_anim:
				sprite.play(static_anim)
	else:
		if sprite.sprite_frames.has_animation(static_anim):
			if sprite.animation != static_anim:
				sprite.play(static_anim)


## Convert velocity to 8-direction name.
func _velocity_to_direction() -> String:
	if velocity.length_squared() < 1.0:
		return "south"
	var deg := rad_to_deg(velocity.angle())
	if deg < 0:
		deg += 360.0
	if deg < 22.5 or deg >= 337.5:
		return "east"
	elif deg < 67.5:
		return "south_east"
	elif deg < 112.5:
		return "south"
	elif deg < 157.5:
		return "south_west"
	elif deg < 202.5:
		return "west"
	elif deg < 247.5:
		return "north_west"
	elif deg < 292.5:
		return "north"
	else:
		return "north_east"


## Take damage from projectiles or other sources.
func take_damage(amount: int) -> void:
	hp -= amount
	_flash_hit()
	if hp <= 0:
		_die()


## Brief red flash on hit.
func _flash_hit() -> void:
	if sprite:
		sprite.modulate = Color.RED
		var tween := create_tween()
		tween.tween_property(sprite, "modulate", Color.WHITE, 0.12)


## Drop scrap and remove from scene.
func _die() -> void:
	GameState.add_scrap(scrap_value)
	GameState.enemies_killed += 1
	_play_death_sound()
	_spawn_scrap_text()
	queue_free()


## Play enemy death sound from the scene tree (since we're about to queue_free).
func _play_death_sound() -> void:
	var path := "res://assets/sounds/lowDown.mp3"
	if not ResourceLoader.exists(path):
		return
	var player := AudioStreamPlayer2D.new()
	player.stream = load(path)
	player.global_position = global_position
	# Add to scene root so it persists after enemy is freed
	get_tree().current_scene.add_child(player)
	player.play()
	# Auto-cleanup after sound finishes
	player.finished.connect(player.queue_free)


## Show "+10 scrap" floating text on death.
func _spawn_scrap_text() -> void:
	var label := Label.new()
	label.text = "+" + str(scrap_value)
	label.add_theme_font_size_override("font_size", 8)
	label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.2))
	label.global_position = global_position - Vector2(10, 20)
	get_tree().current_scene.add_child(label)

	var tween := label.create_tween()
	tween.set_parallel(true)
	tween.tween_property(label, "position:y", label.position.y - 30, 0.8)
	tween.tween_property(label, "modulate:a", 0.0, 0.8)
	tween.chain().tween_callback(label.queue_free)
