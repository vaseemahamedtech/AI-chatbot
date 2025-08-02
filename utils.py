import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

def get_gemini_response(question):
    try:
        model = genai.GenerativeModel("models/gemini-2.0-flash")
        response = model.generate_content(question)
        return response.text.strip()
    except Exception as e:
        return f"⚠️ Gemini Error: {str(e)}"
