def calculate_world_state(today: dict, history: list) -> dict:
    sleep = today.get("sleep", 6)
    water = today.get("water", 4)
    exercise = today.get("exercise", "none")
    nutrition = today.get("nutrition", "okay")
    mood = today.get("mood", 2)

    # Sky state from sleep
    if sleep >= 8:
        sky = "clear"
    elif sleep >= 7:
        sky = "partly_clear"
    elif sleep >= 6:
        sky = "cloudy"
    else:
        sky = "dark"

    # River state from water
    if water >= 8:
        river = "full"
    elif water >= 6:
        river = "flowing"
    elif water >= 4:
        river = "low"
    else:
        river = "dry"

    # Animal state from exercise
    exercise_map = {"intense": "energetic", "moderate": "active", "light": "resting", "none": "absent"}
    animal_state = exercise_map.get(exercise, "resting")

    # Forest state from nutrition
    nutrition_map = {"great": "lush", "good": "green", "okay": "sparse", "poor": "bare"}
    forest = nutrition_map.get(nutrition, "sparse")

    # Weather from mood
    if mood >= 4:
        weather = "sunny"
    elif mood >= 3:
        weather = "overcast"
    elif mood >= 2:
        weather = "cloudy"
    else:
        weather = "stormy"

    # Season from 14-day average
    season = _calculate_season(history)

    # Companion expression
    expression = _companion_expression(sleep, exercise, mood, season)

    return {
        "sky": sky,
        "river": river,
        "animal": animal_state,
        "forest": forest,
        "weather": weather,
        "season": season,
        "expression": expression,
    }


def _calculate_season(history: list) -> str:
    if len(history) < 3:
        return "spring"

    recent = history[-14:]
    scores = []
    for entry in recent:
        s = 0
        s += min(entry.get("sleep", 5) / 8, 1) * 25
        s += min(entry.get("water", 4) / 8, 1) * 25
        ex_map = {"intense": 1, "moderate": 0.75, "light": 0.5, "none": 0}
        s += ex_map.get(entry.get("exercise", "none"), 0) * 25
        nu_map = {"great": 1, "good": 0.75, "okay": 0.5, "poor": 0}
        s += nu_map.get(entry.get("nutrition", "okay"), 0.5) * 25
        scores.append(s)

    avg = sum(scores) / len(scores)

    if avg >= 75:
        return "summer"
    elif avg >= 55:
        return "spring"
    elif avg >= 35:
        return "autumn"
    else:
        return "winter"


def _companion_expression(sleep: int, exercise: str, mood: int, season: str) -> str:
    if season == "winter":
        return "worried"
    if sleep < 6 and mood <= 2:
        return "tired"
    if exercise in ("moderate", "intense") and mood >= 3:
        return "energetic"
    return "calm"
