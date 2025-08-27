from flask import Flask, render_template, request, jsonify
import os, time, logging, threading, multiprocessing, requests
from functools import wraps
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("⚠️ GOOGLE_API_KEY missing in environment variables")

# Initialize Gemini client
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

# TTS process management
tts_process = None
tts_lock = threading.Lock()

def speak_in_process(text):
    """Function to run TTS in separate process"""
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.say(text)
        engine.runAndWait()
        engine.stop()
    except Exception as e:
        logger.warning(f"TTS error: {e}")

def start_tts(text):
    """Start TTS in new process"""
    global tts_process
    with tts_lock:
        stop_tts()
        tts_process = multiprocessing.Process(target=speak_in_process, args=(text,))
        tts_process.daemon = True
        tts_process.start()

def stop_tts():
    """Stop current TTS process"""
    global tts_process
    if tts_process and tts_process.is_alive():
        tts_process.terminate()
        tts_process.join(timeout=1)
        if tts_process.is_alive():
            tts_process.kill()
        tts_process = None

def get_gemini_response_with_sources(question):
    """Get response from Gemini with Google Search grounding (REST API call)"""
    try:
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        headers = {"Content-Type": "application/json"}
        params = {"key": GOOGLE_API_KEY}
        payload = {
            "contents": [{"parts": [{"text": question}]}],
            "tools": [{"google_search_retrieval": {}}]
        }

        resp = requests.post(url, headers=headers, params=params, json=payload)
        resp.raise_for_status()
        data = resp.json()

        # Extract response text
        text = ""
        if "candidates" in data and data["candidates"]:
            parts = data["candidates"][0]["content"]["parts"]
            if parts and "text" in parts[0]:
                text = parts[0]["text"]

        # Extract sources if available
        sources = []
        grounding = data["candidates"][0].get("groundingMetadata", {})
        if "groundingChunks" in grounding:
            for chunk in grounding["groundingChunks"][:3]:
                if "web" in chunk:
                    sources.append({
                        "title": chunk["web"].get("title", "Source"),
                        "url": chunk["web"].get("uri", "")
                    })

        return {"response": text or "⚠️ No response received.", "sources": sources}

    except Exception as e:
        logger.error(f"Gemini error: {e}")
        return {"response": f"⚠️ Error: {str(e)}", "sources": []}

def rate_limit(max_per_second=3):
    """Rate limiting decorator"""
    def decorator(f):
        f.last_called = 0
        f.min_interval = 1.0 / max_per_second
        @wraps(f)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - f.last_called
            left_to_wait = f.min_interval - elapsed
            if left_to_wait > 0:
                time.sleep(left_to_wait)
            ret = f(*args, **kwargs)
            f.last_called = time.time()
            return ret
        return wrapper
    return decorator

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/ask", methods=["POST"])
@rate_limit(max_per_second=3)
def ask():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        data = request.get_json()
        question = data.get("message", "").strip()

        if not question:
            return jsonify({"response": "⚠️ No question received.", "sources": []}), 400

        if len(question) > 500:
            return jsonify({"response": "⚠️ Message too long. Please keep it under 500 characters.", "sources": []}), 400

        # Get response with sources
        result = get_gemini_response_with_sources(question)

        # Start TTS in background
        threading.Thread(target=start_tts, args=(result['response'],), daemon=True).start()

        return jsonify({
            "response": result['response'],
            "sources": result['sources'],
            "timestamp": time.time()
        })

    except Exception as e:
        logger.error(f"Error in /ask endpoint: {e}")
        return jsonify({"response": "⚠️ An error occurred. Please try again.", "sources": []}), 500

@app.route("/stop_speech", methods=["POST"])
def stop_speech():
    try:
        stop_tts()
        return jsonify({"status": "success", "message": "Speech stopped"})
    except Exception as e:
        logger.error(f"Error stopping speech: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(debug=True, threaded=True)
