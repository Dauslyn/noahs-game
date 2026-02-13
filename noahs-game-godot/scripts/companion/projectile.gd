## Projectile fired by B3ANS toward enemies.
## Moves in a straight line, damages on contact, self-destructs.
extends Area2D

## Movement direction (set by setup()).
var direction: Vector2 = Vector2.RIGHT

## Speed in pixels per second.
var speed: float = 250.0

## Damage dealt on hit.
var damage: int = 10

## Max lifetime before self-destruct (seconds).
var lifetime: float = 3.0

var _age: float = 0.0


func _ready() -> void:
	# Create a small cyan circle as the projectile visual
	var img := Image.create(8, 8, false, Image.FORMAT_RGBA8)
	for y in range(8):
		for x in range(8):
			var dx := x - 4
			var dy := y - 4
			if dx * dx + dy * dy <= 9:  # radius 3
				img.set_pixel(x, y, Color(0.3, 0.9, 1.0))
	var tex := ImageTexture.create_from_image(img)
	var vis := $Sprite
	if vis and vis is Sprite2D:
		vis.texture = tex
		vis.scale = Vector2.ONE


## Initialize projectile direction, speed, and damage.
func setup(dir: Vector2, spd: float, dmg: int) -> void:
	direction = dir.normalized()
	speed = spd
	damage = dmg
	# Rotate sprite to face direction
	rotation = direction.angle()


func _physics_process(delta: float) -> void:
	position += direction * speed * delta

	_age += delta
	if _age >= lifetime:
		queue_free()


## Called when projectile overlaps an enemy hurtbox.
func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("enemies") and body.has_method("take_damage"):
		body.take_damage(damage)
		_spawn_hit_effect()
		queue_free()


## Brief hit flash particle (simple visual feedback).
func _spawn_hit_effect() -> void:
	# Create a simple expanding circle that fades
	var effect := Sprite2D.new()
	effect.texture = PlaceholderTexture2D.new()
	effect.modulate = Color(0.3, 0.9, 1.0, 0.8)
	effect.scale = Vector2(0.2, 0.2)
	effect.global_position = global_position
	get_tree().current_scene.add_child(effect)

	var tween := effect.create_tween()
	tween.set_parallel(true)
	tween.tween_property(effect, "scale", Vector2(0.6, 0.6), 0.15)
	tween.tween_property(effect, "modulate:a", 0.0, 0.15)
	tween.chain().tween_callback(effect.queue_free)
