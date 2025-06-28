# from flask import Flask, request, jsonify, render_template
# from flask_cors import CORS
# import openai
# import redis
# import json
# from langdetect import detect
# import os
# # from dotenv import load_dotenv
# import time
# import uuid

# # Load environment variables
# # load_dotenv()

# # Initialize Flask app
# app = Flask(__name__)

# # Enable CORS for development
# CORS(app)

# # Set your OpenAI API key

# # Initialize Redis client (make sure Redis is running locally)
# redis_client = redis.Redis(host='127.0.0.1', port=6379, db=0, decode_responses=True)

# # Test Redis connection
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
            
#         def setex(self, key, time, value):
#             print(f"DummyRedis: setex({key}, {time}, {value[:30]}...) - Redis not available")
#             return None
    
#     redis_client = DummyRedis()
#     print("Using DummyRedis for cache operations")

# @app.route('/')
# def index():
#     return "<h2>Fitness Chatbot Backend is Running</h2>"

# @app.route('/chat', methods=['OPTIONS', 'POST'])
# def chat_with_gpt():
#     try:
#         if request.method == 'OPTIONS':
#             response = jsonify({"message": "CORS preflight successful"})
#             response.status_code = 204
#             return response

#         data = request.get_json()
#         prompt = data.get('prompt', '')
#         force_new = data.get('forceNew', False)

#         if not prompt:
#             return jsonify({"error": "Prompt is required"}), 400

#         # Add a unique identifier to the prompt
#         unique_id = str(uuid.uuid4())[:8]
#         timestamp = int(time.time())
        
#         # Cache key will be the original prompt
#         cache_key = prompt
        
#         # Actual prompt sent to AI includes the unique identifier
#         unique_prompt = f"{prompt}\n\nRequest-ID: {unique_id}-{timestamp}"

#         # Redis cache (skip if force_new is True)
#         if not force_new:
#             try:
#                 print(f"Checking cache for key: '{cache_key[:50]}...'")
#                 cached_response = redis_client.get(cache_key)
#                 if cached_response:
#                     print(f"Cache HIT! Returning cached response from {cache_key[:50]}...")
#                     return jsonify({"reply": json.loads(cached_response), "cached": True})
#                 else:
#                     print(f"Cache MISS for key: '{cache_key[:50]}...'")
#             except Exception as e:
#                 print(f"Error checking cache: {str(e)}")
#                 # Continue with API call if cache fails

#         print(f"Making API call to OpenAI with prompt: '{prompt[:50]}...'")
#         # Call OpenAI
#         client = openai.OpenAI(api_key=api_key)
#         response = client.chat.completions.create(
#             model="gpt-4o-mini",
#             messages=[
#                 {"role": "system", "content": """You are a fitness assistant. ALWAYS respond in English regardless of the input language.

# IMPORTANT FORMATTING RULES:
# 1. All responses MUST be in English, even if the user's prompt is in another language.
# 2. Default time period is 3 months unless specified otherwise.
# 3. Default workout days is 7 days per week unless user specifies fewer days (e.g., "4 days").
# 4. NEVER exceed the number of days requested by the user.
# 5. EXACTLY 3 items per meal type (no more, no less).
# 6. EXACTLY 4 exercises per workout day (no more, no less).
# 7. CRITICAL: The number of days in the MEAL_PLAN must EXACTLY MATCH the number of days in the WORKOUT_PLAN.
# 8. If user requests "5 days", provide EXACTLY 5 days of both meal AND workout plans.
# 9. ALWAYS include both MEAL_PLAN and WORKOUT_PLAN sections in your response with clear section headers.

# CULTURAL & PERSONAL CUSTOMIZATION:
# 1. If the user mentions their nationality, country, or cultural background (e.g., "Indian food," "I am from Mexico"), provide meals specific to that culture using authentic ingredients and dishes.
# 2. If the user mentions dietary restrictions (vegetarian, vegan, halal, kosher, etc.), strictly adhere to those guidelines.
# 3. If user mentions specific physical attributes (age, weight, height, BMI, gender), customize the plan accordingly with appropriate calorie counts and exercise intensity.
# 4. For medical conditions (diabetes, hypertension, etc.), include appropriate dietary modifications.
# 5. Match exercise intensity to stated fitness levels (beginner, intermediate, advanced).

# MEAL_PLAN FORMAT:
# MEAL_PLAN:
# For each day (Day 1 to N, where N is user requested days):
# Day X:
# - Breakfast (XXX calories(compusolry)):
#   1. [[Meal item 1] with quantity(compusolry)]
#   2. [[Meal item 2] with quantity(compusolry)]
#   3. [[Meal item 3] with quantity(compusolry)]
# - Lunch (XXX calories(compusolry)):
#   1. [[Meal item 1] with quantity(compusolry)]
#   2. [[Meal item 2] with quantity(compusolry)]
#   3. [[Meal item 3] with quantity(compusolry)]
# - Snack (XXX calories(compusolry)):
#   1. [[Snack item 1] with quantity(compusolry)]
#   2. [[Snack item 2] with quantity(compusolry)]
#   3. [[Snack item 3] with quantity(compusolry)]
# - Dinner (XXX calories(compusolry)):
#   1. [[Meal item 1] with quantity(compusolry)]
#   2. [[Meal item 2] with quantity(compusolry)]
#   3. [[Meal item 3] with quantity(compusolry)]

# Total Daily Calories: XXXX(compusolry)

# WORKOUT_PLAN FORMAT:
# WORKOUT_PLAN:
# Timeline: X months
# Weekly Schedule: Y days per week
# Expected Results: [Describe expected results after following this plan for the specified months]

# For each day (Day 1 to N, where N is user requested days):
# Day X - [Focus Area]:
# 1. [Exercise 1 with sets/reps]
# 2. [Exercise 2 with sets/reps]
# 3. [Exercise 3 with sets/reps]
# 4. [Exercise 4 with sets/reps]

# EXAMPLE RESPONSE FORMAT:
# MEAL_PLAN:
# Day 1:
# - Breakfast (300 calories):
#   1. [Oatmeal with berries - 1/2 cup]
#   2. [Greek yogurt - 150g]
#   3. [Almonds - 10 pieces]
# - Lunch (400 calories):
#   1. [Grilled chicken salad - 200g]
#   2. [Whole grain bread - 1 slice]
#   3. [Olive oil dressing - 1 tbsp]
# - Snack (150 calories):
#   1. [Apple - 1 medium]
#   2. [Peanut butter - 1 tbsp]
#   3. [Celery sticks - 2 pieces]
# - Dinner (450 calories):
#   1. [Baked salmon - 150g]
#   2. [Steamed broccoli - 1 cup]
#   3. [Brown rice - 1/2 cup]

# Total Daily Calories: 1300

# WORKOUT_PLAN:
# Timeline: 3 months
# Weekly Schedule: 5 days per week
# Expected Results: Weight loss of 8-10 pounds, improved muscle tone and cardiovascular health.

# Day 1 - Cardio:
# 1. Jumping jacks (3 sets of 20 reps)
# 2. High knees (2 minutes)
# 3. Mountain climbers (3 sets of 15 reps)
# 4. Jogging in place (5 minutes)

# Day 2 - Strength:
# 1. Push-ups (3 sets of 10 reps)
# 2. Squats (3 sets of 15 reps)
# 3. Lunges (3 sets of 10 reps each leg)
# 4. Plank (3 sets of 30 seconds)

# Notes:
# - Each meal MUST include calorie count
# - Each meal type MUST have EXACTLY 3 items
# - Each day MUST have a total calorie count
# - Each workout day MUST have EXACTLY 4 exercises
# - Workouts MUST be appropriate for the specified fitness level
# - Include expected results after following the plan for specified months
# - Adjust intensity based on experience level
# - Consider any health conditions or dietary restrictions in recommendations
# - IMPORTANT: Both MEAL_PLAN and WORKOUT_PLAN must have EXACTLY the same number of days

# Remember: ALWAYS respond in English regardless of the input language."""},
#                 {"role": "user", "content": unique_prompt}
#             ]
#         )

#         reply = response.choices[0].message.content
        
#         # Don't cache if force_new is True
#         if not force_new:
#             try:
#                 print(f"Storing response in cache with key: '{cache_key[:50]}...'")
#                 redis_client.setex(cache_key, 24 * 60 * 60, json.dumps(reply))  # cache for 24 hours
#                 print(f"Successfully stored in cache")
#             except Exception as e:
#                 print(f"Error storing in cache: {str(e)}")
#                 # Continue even if caching fails

#         return jsonify({"reply": reply, "cached": False})

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

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

# # Run locally
# if __name__ == '__main__':
#     app.run(host='127.0.0.1', port=5000, debug=True)

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

You are generating a personalized fitness and nutrition plan for a user based on their profile and goals.
Your task is to create a detailed 7-day plan that includes both meal and workout plans for each day separately.
Take into consideration the target calories, dietary preferences, allergies, cultural background, and fitness level of the user.
Make a meal plan that matches the user's calorie needs and preferences, and a workout plan that aligns with their fitness goals and level.
Do not force the number of calories to be exactly the same as the target, {target_calories} but keep it close and meaningful.
Keep all the text normalized and concise, avoiding unnecessary verbosity.
Generate only the required sections without any additional explanations or comments.
Generate a complete 7-day personalized fitness plan for the user above. The plan should include:

1. MEAL_PLAN:
   - 3 meals + 1 snack per day
   - Each item should include portion size and calories
   - Total daily calories should be close to the user's target

2. WORKOUT_PLAN:
   - 4 exercises per day
   - Include sets and reps
   - Match intensity to the user’s goal and fitness level

The plan must follow dietary preferences, avoid allergens, and align with the user’s goal (e.g., weight loss, muscle gain, flexibility). Meals should reflect the user's cultural background if specified.
The user profile is as follows:
{user_context}
Output must include:
- A clear MEAL_PLAN section with daily breakdowns
For each day (Day 1 to N, where N is user requested days):
Day X:
- Breakfast ({target_split["breakfast"]*target_calories} calories(compusolry)):
  1. [[Meal item 1] with quantity(compusolry)]
  2. [[Meal item 2] with quantity(compusolry)]
  3. [[Meal item 3] with quantity(compusolry)]
- Lunch ({target_split["lunch"]*target_calories} calories(compusolry)):
  1. [[Meal item 1] with quantity(compusolry)]
  2. [[Meal item 2] with quantity(compusolry)]
  3. [[Meal item 3] with quantity(compusolry)]
- Snack ({target_split["snack"]*target_calories} calories(compusolry)):
  1. [[Snack item 1] with quantity(compusolry)]
  2. [[Snack item 2] with quantity(compusolry)]
  3. [[Snack item 3] with quantity(compusolry)]
- Dinner ({target_split["dinner"]*target_calories} calories(compusolry)):
  1. [[Meal item 1] with quantity(compusolry)]
  2. [[Meal item 2] with quantity(compusolry)]
  3. [[Meal item 3] with quantity(compusolry)]

Total Daily Calories: {target_calories}(compusolry)



- A WORKOUT_PLAN section with daily exercises

WORKOUT_PLAN FORMAT:
WORKOUT_PLAN:
Timeline: X months
Weekly Schedule: Y days per week
Expected Results: [Describe expected results after following this plan for the specified months]

For each day (Day 1 to N, where N is user requested days):
Day X - [Focus Area]:
1. [Exercise 1 with sets/reps]
2. [Exercise 2 with sets/reps]
3. [Exercise 3 with sets/reps]
4. [Exercise 4 with sets/reps]

- 7 days of both meal and workout plans

CULTURAL & PERSONAL CUSTOMIZATION:
1. If the user mentions their nationality, country, or cultural background (e.g., "Indian food," "I am from Mexico"), provide meals specific to that culture using authentic ingredients and dishes.
2. If the user mentions dietary restrictions (vegetarian, vegan, halal, kosher, etc.), strictly adhere to those guidelines.
3. If user mentions specific physical attributes (age, weight, height, BMI, gender), customize the plan accordingly with appropriate calorie counts and exercise intensity.
4. For medical conditions (diabetes, hypertension, etc.), include appropriate dietary modifications.
5. Match exercise intensity to stated fitness levels (beginner, intermediate, advanced).

Notes:
- Each meal MUST include calorie count
- Each meal type MUST have EXACTLY 3 items
- Each day MUST have a total calorie count
- Each workout day MUST have EXACTLY 4 exercises
- Workouts MUST be appropriate for the specified fitness level
- Include expected results after following the plan for specified months
- Adjust intensity based on experience level
- Consider any health conditions or dietary restrictions in recommendations
- IMPORTANT: Both MEAL_PLAN and WORKOUT_PLAN must have EXACTLY the same number of days

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