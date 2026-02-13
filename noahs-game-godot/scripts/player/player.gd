## Player controller for Noah.
## 8-directional isometric movement with dash/dodge.
extends CharacterBody2D

## Movement speed in pixels per second.
@export var move_speed: float = 120.0

## Dash burst speed multiplier.
@export var dash_speed_mult: float = 3.5

## Duration of a dash in seconds.
@export var dash_duration: float = 0.2

## Cooldown between dashes in seconds.
@export var dash_cooldown: float = 0.6

## Max health points.
@export var max_hp: int = 100

## Current health.
var hp: int = 100

## Current facing direction as a unit vector.
var facing: Vector2 = Vector2.DOWN

## Internal dash state.
var _is_dashing: bool = false
var _dash_timer: float = 0.0
var _dash_cooldown_timer: float = 0.0
var _dash_direction: Vector2 = Vector2.ZERO

## Child node references.
@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var dash_trail: GPUParticles2D = $DashTrail
@onready var dash_sound: AudioStreamPlayer2D = $DashSound
@onready var hit_sound: AudioStreamPlayer2D = $HitSound


func _ready() -> void:
	hp = max_hp
	_load_sprites()
	PlayerEffects.setup_dash_particles(dash_trail)
	PlayerEffects.load_sounds(dash_sound, hit_sound)


func _physics_process(delta: float) -> void:
	_update_dash_timers(delta)

	if _is_dashing:
		_process_dash()
	else:
		_process_movement()

	move_and_slide()
	_update_animation()


## Read WASD input and compute velocity.
func _process_movement() -> void:
	var input_dir := Input.get_vector(
		"move_left", "move_right", "move_up", "move_down"
	)

	if input_dir.length_squared() > 0.01:
		input_dir = input_dir.normalized()
		facing = input_dir
		velocity = input_dir * move_speed
	else:
		velocity = velocity.move_toward(
			Vector2.ZERO, move_speed * 8.0 * get_physics_process_delta_time()
		)

	if Input.is_action_just_pressed("dash") and _dash_cooldown_timer <= 0.0:
		_start_dash()


## Initiate a dash in the current facing direction.
func _start_dash() -> void:
	_is_dashing = true
	_dash_timer = dash_duration
	_dash_cooldown_timer = dash_cooldown
	var input_dir := Input.get_vector(
		"move_left", "move_right", "move_up", "move_down"
	)
	if input_dir.length_squared() > 0.01:
		_dash_direction = input_dir.normalized()
	else:
		_dash_direction = facing

	_set_invincible(true)

	if dash_trail:
		dash_trail.emitting = true
	if dash_sound and dash_sound.stream:
		dash_sound.play()


## Apply dash velocity each frame while dashing.
func _process_dash() -> void:
	velocity = _dash_direction * move_speed * dash_speed_mult


## Tick down dash and cooldown timers.
func _update_dash_timers(delta: float) -> void:
	if _dash_cooldown_timer > 0.0:
		_dash_cooldown_timer -= delta

	if _is_dashing:
		_dash_timer -= delta
		if _dash_timer <= 0.0:
			_is_dashing = false
			_set_invincible(false)


## Toggle hurtbox for invincibility during dash.
func _set_invincible(on: bool) -> void:
	var hurtbox := get_node_or_null("HurtboxArea") as Area2D
	if hurtbox:
		hurtbox.monitoring = not on
		hurtbox.monitorable = not on


## Pick the correct animation based on facing direction.
func _update_animation() -> void:
	if not sprite:
		return

	var dir_name := _facing_to_direction_name()
	var anim_name: String

	if _is_dashing:
		anim_name = "walk_" + dir_name
		sprite.speed_scale = 2.0
	elif velocity.length_squared() > 10.0:
		anim_name = "walk_" + dir_name
		sprite.speed_scale = 1.0
	else:
		anim_name = "idle_" + dir_name
		sprite.speed_scale = 1.0

	if sprite.sprite_frames and sprite.sprite_frames.has_animation(anim_name):
		if sprite.animation != anim_name:
			sprite.play(anim_name)
	else:
		var static_name := "static_" + dir_name
		if sprite.sprite_frames and sprite.sprite_frames.has_animation(static_name):
			if sprite.animation != static_name:
				sprite.play(static_name)


## Convert facing vector to 8-direction name via angle bucketing.
## 0° = east, 90° = south, 180° = west, 270° = north.
func _facing_to_direction_name() -> String:
	var deg := rad_to_deg(facing.angle())
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


## Load Noah's PixelLab sprites into AnimatedSprite2D.
func _load_sprites() -> void:
	var frames := SpriteLoader.load_rotations(
		"res://assets/characters/noah/rotations"
	)
	# Load extracted individual frame animations (from ZIP)
	var walk_dir := "res://assets/characters/noah/extracted/animations/walking"
	var idle_dir := "res://assets/characters/noah/extracted/animations/breathing-idle"
	SpriteLoader.load_animation_frames(walk_dir, "walk", frames, 8.0)
	SpriteLoader.load_animation_frames(idle_dir, "idle", frames, 6.0)
	sprite.sprite_frames = frames
	if frames.has_animation("idle_south"):
		sprite.play("idle_south")
	elif frames.has_animation("static_south"):
		sprite.play("static_south")
	elif frames.get_animation_names().size() > 0:
		sprite.play(frames.get_animation_names()[0])
	else:
		var tex := PlayerEffects.create_placeholder_circle(16, Color(0.2, 0.4, 0.9))
		frames.add_animation("placeholder")
		frames.add_frame("placeholder", tex)
		sprite.play("placeholder")


## Take damage from an external source.
func take_damage(amount: int) -> void:
	if _is_dashing:
		return

	if GameState.shield_charge:
		GameState.shield_charge = false
		return

	hp -= amount
	# Red flash on damage
	sprite.modulate = Color.RED
	var tween := create_tween()
	tween.tween_property(sprite, "modulate", Color.WHITE, 0.15)

	if hit_sound and hit_sound.stream:
		hit_sound.play()

	if hp <= 0:
		_die()


## Handle player death.
func _die() -> void:
	GameState.apply_death_penalty()
	hp = max_hp
	position = Vector2(320, 180)
