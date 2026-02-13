## Global game state singleton (autoload).
## Persists across scene changes. Holds economy, unlocks, and run state.
extends Node

## Economy
var scrap: int = 0

## Equipped weapon ID: "laser", "rockets", or "plasma"
var equipped_weapon: String = "laser"

## Permanent unlocks (survive death)
var unlocked_weapons: Array[String] = ["laser"]
var ship_tier: int = 1

## Consumables (cleared on death)
var shield_charge: bool = false
var repair_kit: bool = false

## Run tracking
var enemies_killed: int = 0
var run_start_time: float = 0.0


## Called when the player dies. Halves scrap, clears consumables.
func apply_death_penalty() -> void:
	scrap = scrap / 2
	equipped_weapon = "laser"
	shield_charge = false
	repair_kit = false
	enemies_killed = 0


## Award scrap to the player.
func add_scrap(amount: int) -> void:
	scrap += amount


## Check if a weapon is unlocked.
func is_weapon_unlocked(weapon_id: String) -> bool:
	return weapon_id in unlocked_weapons


## Unlock a weapon permanently.
func unlock_weapon(weapon_id: String) -> void:
	if weapon_id not in unlocked_weapons:
		unlocked_weapons.append(weapon_id)
