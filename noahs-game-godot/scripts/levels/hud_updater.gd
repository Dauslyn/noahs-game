## Updates HUD labels every frame with player HP and scrap count.
extends CanvasLayer

@onready var hp_label: Label = $HPLabel
@onready var scrap_label: Label = $ScrapLabel


func _process(_delta: float) -> void:
	var player := get_tree().get_first_node_in_group("player")
	if player and "hp" in player:
		hp_label.text = "HP: " + str(player.hp)
	scrap_label.text = "Scrap: " + str(GameState.scrap)
