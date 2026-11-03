# Numiro — Universal AI Starter

A free-first, local-first AI assistant starter. It includes:
- Chat with a local Ollama model
- Internet search through DuckDuckGo results
- Website project planning
- Installable PWA interface
- FastAPI backend and SQLite-ready architecture

## What this version is (and isn't)
This is a working starter, not an all-knowing autonomous AI. It does not train a foundation model, know the entire internet, generate video, or safely execute arbitrary code. It retrieves web search results and uses a local model for responses. Advanced image/video generation and native desktop/mobile packaging are later modules.

## Requirements
- Python 3.10+
- Ollama installed: https://ollama.com
- A computer with enough RAM/storage for your chosen model
- Internet for model downloads and web search

A phone can access Numiro over your local Wi-Fi after the server is started on your computer. The computer must remain on. For use away from home, deploy securely to a server or use a VPN; do not expose the development server directly to the public internet.

## 1. Install a local AI model
Install and open Ollama, then run:

```bash
ollama pull qwen2.5:3b
```

For a lower-memory device, choose a smaller available model. For stronger answers, use a larger model if your hardware supports it. You can see installed models with:

```bash
ollama list
```

## 2. Install Numiro

Extract the ZIP, open a terminal in the `numiro` folder, then:

### Windows PowerShell
```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### macOS / Linux
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000`.

## 3. Use on Android / another device
Keep the computer and phone on the same Wi-Fi. Find the computer's local IP address, then open:

`http://YOUR-COMPUTER-IP:8000`

Example only: `http://192.168.1.20:8000`

Allow port 8000 through your computer's private-network firewall if prompted. For PWA installation, production use should be served over HTTPS (localhost is also treated as secure on the same device). The development server is not hardened for public internet access.

## 4. Features
- AI Assistant: conversation with Ollama
- Internet Search: search results with source links
- Website Planner: asks the model for a structured website plan

## 5. Change the model
Set an environment variable before starting the server:

```bash
# Windows PowerShell
$env:NUMIRO_MODEL="llama3.2:3b"

# macOS / Linux
export NUMIRO_MODEL="llama3.2:3b"
```

The model name must match an installed Ollama model.

## 6. Troubleshooting
- "Cannot reach Ollama": open Ollama and confirm `ollama list` works.
- Model missing: run `ollama pull qwen2.5:3b`.
- Slow answers: choose a smaller model or reduce other running apps.
- Search unavailable: confirm internet access and reinstall requirements.
- Phone cannot connect: confirm same Wi-Fi, use the computer's LAN IP, and check firewall.

## Security before public deployment
This starter is for local/private development. Before hosting publicly:
- Replace wildcard CORS with your exact frontend origin.
- Add authentication, rate limiting, HTTPS, request logging and abuse controls.
- Keep Ollama and administrative endpoints private.
- Add a sandbox for generated code; never run model-generated code directly on your host.
- Add explicit user approval before actions that send messages, spend money, delete files or change accounts.

## Roadmap
1. Secure accounts and persistent conversation history (SQLite)
2. Tool-calling planner with explicit permissions
3. File upload and document Q&A
4. Real website file generation in a restricted workspace
5. Image generation via a compatible local model
6. Voice input/output
7. Desktop packaging with Tauri
8. Android packaging with Capacitor
9. Optional remote deployment

## License
Starter project code: MIT-style permission to use, modify and distribute. Model weights and third-party services have their own licenses and terms.


## Voice assistant (new)
The chat screen includes:
- Microphone button for speech-to-text using the browser Web Speech API
- Spoken assistant replies using browser speech synthesis
- English (India), Hindi and English (US) language choices
- A toggle to enable/disable spoken replies

Voice input requires a supported browser (for example, compatible Chrome versions), microphone permission, and a secure context (HTTPS or localhost). Some browsers send speech to an online recognition service; this is not guaranteed to be fully offline or private. If speech recognition is unavailable, use your Android keyboard's microphone for dictation. Voice replies use voices installed/provided by the browser/device.

This is push-to-talk, not an always-listening wake-word assistant. Always-listening behavior is intentionally not enabled.
