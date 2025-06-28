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
