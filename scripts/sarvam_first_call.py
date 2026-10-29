"""First Sarvam call: Telugu text-to-speech, saved to media/sarvam_first_call.wav.

Run from the repo root:  .venv/Scripts/python scripts/sarvam_first_call.py
Reads SARVAM_API_KEY from the environment or .env (never printed).
"""
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sarvamai import SarvamAI

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
key = os.environ.get("SARVAM_API_KEY")
if not key:
    sys.exit("SARVAM_API_KEY is not set (add it to .env)")

client = SarvamAI(api_subscription_key=key)
model = os.environ.get("SARVAM_TTS_MODEL", "bulbul:v2")
speaker = os.environ.get("SARVAM_TTS_SPEAKER", "anushka")
text = "నిన్న మీరు ఎనిమిది వేల రెండు వందల రూపాయలు సంపాదించారు."  # "Yesterday you earned 8,200 rupees."

response = client.text_to_speech.convert(
    text=text, language_code="te-IN", speaker=speaker, model=model, output_audio_codec="wav")

out = ROOT / "media" / "sarvam_first_call.wav"
out.parent.mkdir(exist_ok=True)
out.write_bytes(base64.b64decode(response.audios[0]))
print(f"OK model={model} speaker={speaker} request_id={response.request_id} -> {out} ({out.stat().st_size} bytes)")
