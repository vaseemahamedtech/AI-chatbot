Chat Assistant – Voice/Text with Source Citation
This project is a web-based chatbot powered by Google Gemini, featuring:

Ordered Chat Messaging

Black-text Bot Replies

Speech-to-Text (Microphone Input)

Text-to-Speech (TTS) Answer Playback

Stop Speech Playback Button

Copy-to-Clipboard on Any Message

Live Web Citation Links for Answers

Mobile Friendly, Accessible UI

🚀 Quick Start
Clone or Copy the Project Folder

text
git clone <your-repo-url>
cd project-c
Install Python Requirements

text
pip install google-genai pyttsx3 python-dotenv
Set up Google Gemini API Key

Create a .env file in the project root:

text
GEMINI_API_KEY=your_google_ai_api_key_here
Get your key at: https://aistudio.google.com/

Run the Application

text
python app.py
Open Chat UI

Visit http://127.0.0.1:5000 in your browser.

📂 Folder Structure
text
project-c/
├── app.py                  # Flask backend (with TTS and citation support)
├── .env                    # Holds GEMINI_API_KEY
├── templates/
│   └── index.html          # Chat frontend HTML
└── static/
    ├── style.css           # Stylesheet (UI, mobile, sources, etc)
    └── script.js           # All chat, STT, TTS, copy, and source logic
✨ Features
Real-Time Google Search Citations:
Gemini-enabled answers include 2–3 clickable sources per answer, linked below each bot message.

Text-to-Speech (Answer Playback):
Answers are spoken using your PC's built-in voice.
Press ⏹️ to stop playback any time.

Speech-to-Text (Microphone Input):
Press 🎤, speak your question, and send it instantly.

Copy-to-Clipboard:
Hover any bubble, press 📋 to copy just that entire message to your clipboard.

Proper Message Ordering:
No more out-of-order bot replies, even on slow or repeated inputs.

Black Bot Text & Paragraph Spacing:
All bot replies are always shown in black, every paragraph spaced for clarity.

Responsive & Modern UI:
Beautiful on mobile and desktop, color-blind friendly, accessible, and simple.

🔗 Environment Variables
Place in a .env file in the root:

text
GEMINI_API_KEY=your_google_ai_api_key_here
Get your API key: https://aistudio.google.com/

🛠️ Troubleshooting
ImportError: GoogleSearch:
Means you have the wrong SDK.

Uninstall: pip uninstall google-generativeai

Install: pip install google-genai

No voice output:

Ensure pyttsx3 is installed and you have TTS voices.

Try python -c "import pyttsx3; pyttsx3.init().say('Test'); pyttsx3.init().runAndWait()" to test.

Speech and citations not working:

Double check your API key and .env file.

Must be running Python 3.8+.

📱 Browser/Platform Support
Chrome, Edge, Safari, Firefox (speech-to-text supported on modern Chrome/Edge/Safari)

Windows, Linux, macOS

📝 License
MIT (modify/edit for your project or commercial use)

💡 Credits
Google AI Studio / Gemini – Language API & citation search

pyttsx3 – Python TTS Voice

Flask – Web server