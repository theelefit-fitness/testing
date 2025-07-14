import pdfplumber
import re
import json
import traceback
from openai import OpenAI
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Create uploads folder in the same directory as app.py
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(CURRENT_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'pdf'}

# Ensure upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    print(f"Created uploads directory at: {UPLOAD_FOLDER}")

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# === 2. CLEAN EXTRACTED TEXT ===
def clean_text(text):
    text = re.sub(r'\n+', '\n', text)  # remove extra line breaks
    text = re.sub(r'(?<=\d)(\n)(?=\d)', ' ', text)  # fix number breaks
    text = re.sub(r'([a-zA-Z])\n(?=[a-zA-Z])', ' ', text)  # fix word breaks
    return text

# === SET YOUR OPENAI API KEY ===
API_KEY = "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"

# === 3. EXTRACT RAW TEXT FROM PDF ===
def extract_text_from_pdf(path):
    try:
        all_text = ""
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    all_text += clean_text(text) + "\n"
        return all_text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        print(traceback.format_exc())
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

# === 4. GENERATE PROMPT WITH CATEGORY + MEAL_TIME ===
def generate_prompt(raw_text):
    return f"""
You are a smart food planner assistant.

Given the following weekly meal plan text extracted from a fitness PDF, your tasks:

1. Extract all food items mentioned, their total quantities (in g or ml), and calories (if present).
2. Consolidate duplicate items across the entire week by summing quantities.
3. For each item, assign:
   - a "category" (Proteins, Fruits, Vegetables, Grains, Dairy, Nuts/Seeds, Fats/Oils, Beverages, Others)
   - a "meal_time" (Breakfast, Snack, Lunch, Dinner, etc.)
4. Normalize units to "g" or "ml".
5. Return output as a JSON object using this format:

{{
  "items": [
    {{
      "item": "Banana",
      "total_quantity": 970,
      "unit": "g",
      "category": "Fruits",
      "meal_time": "Breakfast"
    }},
    ...
  ]
}}

Only return valid JSON. Ignore irrelevant text and headers.

Meal plan text:
\"\"\"
{raw_text}
\"\"\"
"""

# === 5. CALL OPENAI GPT ===
def call_openai_grocery_parser(prompt, api_key):
    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4",  # Fixed model name
            messages=[
                {"role": "system", "content": "You are a grocery JSON extractor."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error calling OpenAI: {str(e)}")
        print(traceback.format_exc())
        raise Exception(f"Failed to process with OpenAI: {str(e)}")

# === 6. PARSE JSON FROM GPT OUTPUT ===
def extract_json(response_text):
    try:
        json_start = response_text.find("{")
        if json_start == -1:
            raise ValueError("No JSON found in response")
        json_text = response_text[json_start:]
        return json.loads(json_text)
    except Exception as e:
        print(f"Error parsing JSON: {str(e)}")
        print("Raw response:", response_text)
        print(traceback.format_exc())
        raise Exception(f"Failed to parse JSON response: {str(e)}")

# === 7. SAVE FINAL JSON TO FILE ===
def save_json(data, filename="grocery_list.json"):
    with open(filename, "w") as f:
        json.dump(data, f, indent=2)
    print(f"✅ Grocery list saved to {filename}")

@app.route('/process-pdf', methods=['POST'])
def process_pdf():
    try:
        print("=== Starting PDF processing ===")
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if not file or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
            
        try:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            print(f"Saving file to: {filepath}")
            file.save(filepath)
            
            if not os.path.exists(filepath):
                return jsonify({'error': f'Failed to save file at {filepath}'}), 500
            
            print(f"Processing file: {filepath}")
            # Extract and process text
            raw_text = extract_text_from_pdf(filepath)
            print("Text extracted successfully, length:", len(raw_text))
            
            if not raw_text:
                return jsonify({'error': 'No text could be extracted from the PDF'}), 400
            
            prompt = generate_prompt(raw_text)
            print("Prompt generated, length:", len(prompt))
            
            response_text = call_openai_grocery_parser(prompt, API_KEY)
            print("OpenAI response received, length:", len(response_text))
            
            grocery_data = extract_json(response_text)
            print("JSON extracted successfully")
            
            # Clean up the uploaded file
            try:
                os.remove(filepath)
                print(f"Cleaned up file: {filepath}")
            except Exception as cleanup_error:
                print(f"Warning: Failed to clean up file: {cleanup_error}")
            
            if grocery_data:
                print("Returning successful response")
                return jsonify(grocery_data)
            else:
                print("No grocery data extracted")
                return jsonify({'error': 'No grocery data could be extracted'}), 500
                
        except Exception as process_error:
            print(f"Processing error: {str(process_error)}")
            print(traceback.format_exc())
            return jsonify({'error': f'Error processing PDF: {str(process_error)}'}), 500
            
    except Exception as e:
        print(f"Server error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Server error: {str(e)}'}), 500

if __name__ == "__main__":
    print(f"Starting server with upload folder: {UPLOAD_FOLDER}")
    app.run(debug=True, port=5000)
