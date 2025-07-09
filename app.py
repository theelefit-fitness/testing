from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from  openai import OpenAI
import redis
import json
from langdetect import detect
import os
from dotenv import load_dotenv
import time
import uuid
import re
from utils import calculate_bmi, calculate_tdee, goal_config, classify_goal_from_text, get_user_age_from_dob

# Load environment variables
# load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for development
CORS(app, origins="*")  # Allow all origins for development

import os
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
# print("OpenAI API Key loaded successfully",api_key)
# api_key = "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"
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
        user_details = data.get('userDetails', {})
 
        print("Received prompt:", prompt)
        print("Received user details:", user_details)
        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
        
        # Map received user details to expected format
        user_profile = {
            "age": user_details.get("dateOfBirth", ""),  # We'll need to calculate age from DOB
            "weight_kg": user_details.get("weight", ""),
            "height_cm": user_details.get("height", ""),
            "gender":  user_details.get("age",""), # Not provided in current user details
            "diet": "",    # Not provided in current user details
            "allergies": [user_details.get("allergies", "")],
            "goal": user_details.get("healthGoals", ""),
            "activity_level": "moderate",  # Default value
            "location": "",  # Not provided in current user details
            "preferences": [user_details.get("dietaryRestrictions", "")]
        }

        # Calculate BMI and TDEE
        weight = float(user_profile["weight_kg"]) if user_profile["weight_kg"] else 70
        height = float(user_profile["height_cm"]) if user_profile["height_cm"] else 170
        
        bmi = calculate_bmi(weight, height)
        tdee = calculate_tdee(weight, height, 30, "unknown", user_profile["activity_level"]) 
        goal_category = classify_goal_from_text(user_profile["goal"])
        goal_plan = goal_config[goal_category]
        target_calories = round(tdee + goal_plan["calorie_offset"])
        calorie_lower = target_calories - 150
        calorie_upper = target_calories + 150
        workout_focus = goal_plan["workout_focus"]
        user_profile["age"] = get_user_age_from_dob(user_details.get("dateOfBirth", ""))
        age = get_user_age_from_dob(user_profile["age"])
        user_context = f"""
USER PROFILE:
- Weight: {weight} kg
- Height: {height} cm
- BMI: {bmi} 
- age : {age}
- Activity Level: {user_profile["activity_level"]}
- Goal: {user_profile["goal"]}
- Dietary Restrictions: {user_profile["preferences"][0]}
- Allergies: {user_profile["allergies"][0]}
- TDEE: {tdee} kcal/day
- Target Calories for Goal: {target_calories} kcal/day
- Primary Workout Focus: {workout_focus}
- User Prompt : {prompt}
"""

        # Add a unique identifier to the prompt
        unique_id = str(uuid.uuid4())[:8]
        timestamp = int(time.time())
        
        # Actual prompt sent to AI includes the unique identifier
        unique_prompt = f"{prompt}\n\nRequest-ID: {unique_id}-{timestamp}"

        print(f"Making API call to OpenAI with prompt: '{user_context}...'")
        # Call OpenAI
        client = OpenAI()
        print("Target calories for goal:", target_calories)
        response = client.chat.completions.create(
            model="gpt-4-turbo",  
            temperature=0.6,
            top_p=0.9,
            stop=["Request-ID:"],
            messages = [
                {
                    "role": "system",
                    "content": f"""
You are a health assistant generating personalized fitness and nutrition plans.

STRICT OUTPUT RULES:
- Output MUST contain exactly 7 full days of both MEAL_PLAN and WORKOUT_PLAN.
- Do NOT add any reasoning, explanations, or extra text.
- For each MEAL_PLAN day:
  • Include exactly 3 meals (Breakfast, Lunch, Dinner)
  • Include exactly 1 Snack
  • Each meal/snack must have 3 items with grams and calories
  • Daily calorie total must be within ±100 kcal of {target_calories}
- For each WORKOUT_PLAN day:
  • Include 4 exercises with sets x reps

MEAL_PLAN FORMAT:
Include exactly 7 days — Day 1 to Day 7.

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


WORKOUT_PLAN:
Include exactly 7 days — Day 1 to Day 7.
Timeline: [X months]
Weekly Schedule: [Y days/week]
Expected Results: [Short result statement based on user's goal]

For each day (Day 1 to Day 7):

Day X – [Focus Area]:
1. [Exercise 1 — sets x reps]
2. [Exercise 2 — sets x reps]
3. [Exercise 3 — sets x reps]
4. [Exercise 4 — sets x reps]

ADDITIONAL CUSTOMIZATION GUIDELINES:
- Match cultural preferences when possible (e.g., Indian food)
- Respect all dietary restrictions and avoid allergens
- Adjust meal calories and workout difficulty using age, BMI, and activity level
- Vary total daily calories between {calorie_lower} and {calorie_upper}.
- Each day’s total should look natural and not identical to others and accurate to the meals mentioned
"""
                },
                {
                    "role": "user",
                    "content": unique_prompt
                }
            ]
        )
        print("Total tokens used:", response.usage.total_tokens)

        # Defensive: ensure reply is always a string
        reply = response.choices[0].message.content
        if not reply:
            print("No reply from OpenAI, sending error to frontend.")
            return jsonify({"error": "No reply from OpenAI"}), 500

        # Print what is being sent to the frontend
        print("Sending to frontend:", {"reply": reply, "cached": False})

        return jsonify({"reply": reply, "cached": False}), 200

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
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
    app.run(host='127.0.0.1', port=5000, debug=True)