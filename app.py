from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import openai
import redis
import json
from langdetect import detect
import os
from dotenv import load_dotenv
import time
import uuid
from utils import calculate_bmi, calculate_tdee, goal_config, user_profile_default

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for development
CORS(app, origins="*")  # Allow all origins for development

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY not set in .env file")
openai.api_key = api_key

# Set your OpenAI API key

# Initialize Redis client (make sure Redis is running locally)
# redis_client = redis.Redis(host='127.0.0.1', port=6379, db=0, decode_responses=True)

# Test Redis connection
# try:
#     redis_test = redis_client.ping()
#     print(f"Redis connection test: {'SUCCESS' if redis_test else 'FAILED'}")
# except Exception as e:
#     print(f"Redis connection error: {str(e)}")
#     # Set up a dummy redis client that won't error on operations if Redis fails
#     class DummyRedis:
#         def get(self, key):
#             print(f"DummyRedis: get({key}) - Redis not available")
#             return None
#             
#         def setex(self, key, time, value):
#             print(f"DummyRedis: setex({key}, {time}, {value[:30]}...) - Redis not available")
#             return None
#     
#     redis_client = DummyRedis()
#     print("Using DummyRedis for cache operations")

@app.route('/')
def index():
    return "<h2>Fitness Chatbot Backend is Running</h2>"

@app.route('/chat', methods=['OPTIONS', 'POST'])
def chat_with_gpt():
    try:
        if request.method == 'OPTIONS':
            response = jsonify({"message": "CORS preflight successful"})
            response.status_code = 204
            return response

        data = request.get_json()
        prompt = data.get('prompt', '')
        incoming_profile = data.get('userProfile', {})
 

        print("Received prompt:", prompt)
        print("Received user profile:", incoming_profile)
        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
        
        user_profile = {**user_profile_default, **incoming_profile}

        # Use consistent keys (fallback to both possible keys)
        weight = user_profile.get("weight_kg") or user_profile.get("weight")
        height = user_profile.get("height_cm") or user_profile.get("height")
        age = user_profile.get("age")
        gender = user_profile.get("gender")
        diet = user_profile.get("diet", "vegetarian")
        allergies = user_profile.get("allergies", [])
        goal = user_profile.get("goal", "fat loss")
        activity_level = user_profile.get("activity_level") or user_profile.get("activityLevel", "moderate")
        location = user_profile.get("location", "")
        preferences = user_profile.get("preferences", [])

        bmi = calculate_bmi(weight, height)
        tdee = calculate_tdee(weight, height, age, gender, activity_level)
        goal_plan = goal_config.get(goal, goal_config["get_fit"])
        target_calories = tdee + goal_plan["calorie_offset"]
        workout_focus = goal_plan["workout_focus"]
        target_split = {
        "breakfast": 0.25 * target_calories,  # 450
        "lunch": 0.35 * target_calories,      # 630
        "snack": 0.10 * target_calories,      # 180
        "dinner": 0.30 * target_calories      # 540
        }

        user_context = f"""
USER PROFILE:
- Age: {age}
- Weight: {weight} kg
- Height: {height} cm
- BMI: {bmi}
- Gender: {gender}
- Activity Level: {activity_level}
- Goal: {goal}
- Location: {location}
- Dietary Preferences: {", ".join(preferences)}
- Allergies: {", ".join(allergies)}
- TDEE: {tdee} kcal/day
- Target Calories for Goal: {target_calories} kcal/day
- Primary Workout Focus: {workout_focus}
"""

        # Add a unique identifier to the prompt
        unique_id = str(uuid.uuid4())[:8]
        timestamp = int(time.time())
        
        # Actual prompt sent to AI includes the unique identifier
        unique_prompt = f"{prompt}\n\nRequest-ID: {unique_id}-{timestamp}"

        print(f"Making API call to OpenAI with prompt: '{user_context[:50]}...'")
        # Call OpenAI
        client = openai.OpenAI(api_key=api_key)
        print("Target calories for goal:", target_calories)
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages = [
                {
                    "role": "system",
                    "content": f"""
You are generating a 7-day personalized fitness and nutrition plan based on the user's profile.

Your output must include two clearly separated sections:
1. MEAL_PLAN
2. WORKOUT_PLAN

GENERAL INSTRUCTIONS:
- Follow all constraints and structure strictly.
- Match the user’s: target_calories, fitness goal, fitness level, dietary preferences, allergies, cultural background.
- Use concise, normalized English only.
- Do not add comments, reasoning, or extra text.
- Both MEAL_PLAN and WORKOUT_PLAN must have exactly 7 days.
- Calories do not have to match the target exactly but must stay within ±100 kcal of {target_calories}.

MEAL_PLAN FORMAT:
Each day must include:
- 3 meals (Breakfast, Lunch, Dinner)
- 1 Snack
- Each meal/snack must have exactly 3 items, each with:
  - Portion size (in grams)
  - Calories

For each day (Day 1 to Day 7), use this structure:

Day X:
- Breakfast (XXX kcal):
  1. [Meal item 1] — [quantity in grams]
  2. [Meal item 2] — [quantity in grams]
  3. [Meal item 3] — [quantity in grams]

- Lunch (XXX kcal):
  1. [Meal item 1] — [quantity in grams]
  2. [Meal item 2] — [quantity in grams]
  3. [Meal item 3] — [quantity in grams]

- Snack (XXX kcal):
  1. [Snack item 1] — [quantity in grams]
  2. [Snack item 2] — [quantity in grams]
  3. [Snack item 3] — [quantity in grams]

- Dinner (XXX kcal):
  1. [Meal item 1] — [quantity in grams]
  2. [Meal item 2] — [quantity in grams]
  3. [Meal item 3] — [quantity in grams]

Total Daily Calories: XXX kcal

WORKOUT_PLAN FORMAT:

WORKOUT_PLAN:
Timeline: [X months]
Weekly Schedule: [Y days/week]
Expected Results: [Short result statement based on user's goal]

For each day (Day 1 to Day 7):

Day X – [Focus Area]:
1. [Exercise 1 — sets x reps]
2. [Exercise 2 — sets x reps]
3. [Exercise 3 — sets x reps]
4. [Exercise 4 — sets x reps]

CUSTOMIZATION RULES:

1. Cultural Food Matching:
   - If the user specifies a cultural identity (e.g., Indian), use familiar, culturally authentic foods and ingredients.

2. Dietary Restrictions:
   - Respect all preferences (e.g., vegetarian, vegan, halal, gluten-free).
   - Avoid all listed allergens strictly.

3. Physical Attributes:
   - Customize calorie needs and exercise difficulty based on:
     - Age
     - Weight
     - Height
     - BMI
     - Gender

4. Health Conditions:
   - Apply modifications for any relevant conditions (e.g., diabetic-friendly meals, low-sodium for hypertension).

5. Fitness Level:
   - Match workout intensity to fitness level:
     - Beginner: low-impact, controlled movements
     - Intermediate: moderate intensity, added resistance
     - Advanced: high intensity, strength and endurance

6. Calorie Matching:
   - Keep total daily calories within ±100 kcal of {target_calories}.
   - Show total per day at the bottom of each MEAL_PLAN.

INPUT FORMAT:
User context will be provided as:

{user_context}
"""
                },
                {
                    "role": "user",
                    "content": unique_prompt
                }
            ]
        )

        # Defensive: ensure reply is always a string
        reply = response.choices[0].message.content
        if not reply:
            print("No reply from OpenAI, sending error to frontend.")
            return jsonify({"error": "No reply from OpenAI"}), 500

        # Print what is being sent to the frontend
        print("Sending to frontend:", {"reply": reply, "cached": False})

        return jsonify({"reply": reply, "cached": False}), 200

    except Exception as e:
        print("Exception in /chat:", e)
        return jsonify({"error": str(e)}), 500

# @app.route('/check-cache', methods=['OPTIONS', 'POST'])
# def check_cache():
#     """Endpoint to quickly check if a response is cached without making API call"""
#     try:
#         if request.method == 'OPTIONS':
#             response = jsonify({"message": "CORS preflight successful"})
#             response.status_code = 204
#             return response

#         data = request.get_json()
#         prompt = data.get('prompt', '')

#         if not prompt:
#             return jsonify({"error": "Prompt is required"}), 400

#         # Parse useful information from the prompt
#         prompt_info = {
#             "requested_days": 7,  # Default value
#             "countries": [],
#             "dietary_preferences": [],
#             "age": None,
#             "gender": None,
#         }
        
#         # Extract days
#         days_match = prompt.lower().find("days")
#         if days_match > 0:
#             # Look for a number before "days"
#             for i in range(days_match - 1, max(0, days_match - 5), -1):
#                 if prompt[i].isdigit():
#                     day_str = ""
#                     while i >= 0 and prompt[i].isdigit():
#                         day_str = prompt[i] + day_str
#                         i -= 1
#                     if day_str:
#                         prompt_info["requested_days"] = int(day_str)
#                         break
        
#         # Look for country or cuisine references
#         countries = ["indian", "chinese", "mexican", "italian", "japanese", "thai", 
#                     "korean", "french", "greek", "mediterranean", "american", "middle eastern",
#                     "spanish", "turkish", "brazilian", "vietnamese"]
        
#         for country in countries:
#             if country.lower() in prompt.lower():
#                 prompt_info["countries"].append(country)
        
#         # Look for dietary preferences
#         diets = ["vegetarian", "vegan", "keto", "paleo", "gluten-free", "dairy-free", 
#                 "low-carb", "high-protein", "halal", "kosher"]
        
#         for diet in diets:
#             if diet.lower() in prompt.lower():
#                 prompt_info["dietary_preferences"].append(diet)
        
#         # Check Redis cache
#         try:
#             print(f"Cache check for key: '{prompt[:50]}...'")
#             cached_response = redis_client.get(prompt)
            
#             if cached_response:
#                 print(f"Cache check HIT for key: '{prompt[:50]}...'")
#                 return jsonify({
#                     "cached": True,
#                     "reply": json.loads(cached_response),
#                     "requestedDays": prompt_info["requested_days"],
#                     "promptInfo": prompt_info
#                 })
#             else:
#                 print(f"Cache check MISS for key: '{prompt[:50]}...'")
#         except Exception as e:
#             print(f"Error checking cache: {str(e)}")
#             # Continue with miss response if cache check fails
        
#         return jsonify({
#             "cached": False,
#             "promptInfo": prompt_info
#         })

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
# Run locally
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)