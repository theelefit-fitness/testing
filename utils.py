import re
def calculate_bmi(weight_kg, height_cm):
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 2)

def calculate_tdee(weight_kg, height_cm, age, gender, activity_level):
    height_m = height_cm / 100
    bmi = calculate_bmi(weight_kg, height_cm)
    
    # BMR: Mifflin-St Jeor Equation
    if gender == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

    activity_factors = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very active": 1.9
    }
    return int(bmr * activity_factors.get(activity_level, 1.55))

goal_config = {
    "weight_loss": {"calorie_offset": -500, "workout_focus": "Fat Burn & Cardio"},
    "muscle_gain": {"calorie_offset": +500, "workout_focus": "Strength & Hypertrophy"},
    "get_fit": {"calorie_offset": 0, "workout_focus": "Mixed Cardio and Strength"},
    "get_stronger": {"calorie_offset": +300, "workout_focus": "Progressive Overload & Compound Lifts"},
    "get_flexible": {"calorie_offset": 0, "workout_focus": "Mobility, Yoga, and Stretching"}
}


user_profile_default = {
    "name": "John Doe",
    "weight": 70,
    "height": 175,
    "age": 26,
    "gender": "male",
    "activity_level": "moderate",  
    "goal": "weight_loss",         
    "location": "India",
    "preferences": ["vegetarian"],
    "allergies": ["nuts"]
}

def get_user_age_from_dob(dob: str) -> int:
    from datetime import datetime
    try:
        birth_date = datetime.strptime(dob, "%Y-%m-%d")
        today = datetime.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except ValueError:
        return 0  # Return 0 if the date format is incorrect or parsing fails


def classify_goal_from_text(goal_text: str) -> str:
    goal_text = goal_text.lower()

    if re.search(r"(lose|shed|drop)\s+(weight|fat)", goal_text) or \
       re.search(r"fat\s+loss", goal_text) or \
       re.search(r"weight\s+loss", goal_text) or \
       re.search(r"slim\s+down", goal_text):
        return "weight_loss"

    if re.search(r"(gain|build|increase)\s+(muscle|mass)", goal_text) or \
       re.search(r"muscle\s+gain", goal_text) or \
       re.search(r"bulk", goal_text):
        return "muscle_gain"

    if re.search(r"(get|become|feel)\s+(stronger|strong)", goal_text) or \
       re.search(r"increase\s+strength", goal_text) or \
       re.search(r"lift\s+heavier", goal_text):
        return "get_stronger"

    if re.search(r"(become|get|improve)\s+(flexible|mobility)", goal_text) or \
       re.search(r"(yoga|stretching|mobility\s+training)", goal_text):
        return "get_flexible"

    if re.search(r"get\s+fit", goal_text) or \
       re.search(r"(stay|keep)\s+(active|healthy)", goal_text) or \
       re.search(r"overall\s+fitness", goal_text) or \
       re.search(r"improve\s+fitness", goal_text):
        return "get_fit"

    # Default fallback
    return "get_fit"

