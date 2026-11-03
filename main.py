import os
from pathlib import Path
from typing import Optional
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    from ddgs import DDGS
except ImportError:
    DDGS = None

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("NUMIRO_MODEL", "qwen2.5:3b")

app = FastAPI(title="Numiro API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to your app's origin before public deployment.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    model: Optional[str] = None
    history: list[dict] = Field(default_factory=list)

class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)

SYSTEM_PROMPT = """You are Numiro, a helpful, honest, capable general-purpose AI assistant.
Give clear and practical answers. If you are uncertain, say so. Never claim to have
searched the internet, opened a file, executed code, or completed an action unless
the relevant tool actually did it. Do not reveal secrets or request passwords.
When writing code, provide complete, runnable examples where practical."""

@app.get("/api/health")
async def health():
    return {"status": "ok", "name": "Numiro", "model": DEFAULT_MODEL}

@app.get("/api/models")
async def models():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            r.raise_for_status()
            data = r.json()
        return {"models": [m.get("name") for m in data.get("models", [])]}
    except Exception:
        return {"models": [], "note": "Ollama is not reachable. Start Ollama and download a model."}

@app.post("/api/chat")
async def chat(req: ChatRequest):
    model = req.model or DEFAULT_MODEL
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in req.history[-12:]:
        role = item.get("role")
        content = item.get("content")
        if role in ("user", "assistant") and isinstance(content, str):
            messages.append({"role": role, "content": content[:12000]})
    messages.append({"role": "user", "content": req.message})
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            r = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={"model": model, "messages": messages, "stream": False},
            )
            r.raise_for_status()
            data = r.json()
        answer = data.get("message", {}).get("content", "").strip()
        if not answer:
            raise HTTPException(status_code=502, detail="The model returned an empty response.")
        return {"answer": answer, "model": model}
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Numiro cannot reach Ollama. Install/start Ollama and download a model."
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="The AI model took too long. Try a smaller model.")
    except httpx.HTTPStatusError as e:
        detail = e.response.text[:500]
        raise HTTPException(status_code=502, detail=f"Ollama error: {detail}")

@app.post("/api/search")
async def search(req: SearchRequest):
    if DDGS is None:
        raise HTTPException(status_code=503, detail="Search package missing. Install requirements.txt.")
    try:
        results = list(DDGS().text(req.query, max_results=6))
        cleaned = [{
            "title": x.get("title", ""),
            "url": x.get("href", ""),
            "snippet": x.get("body", "")
        } for x in results]
        return {"query": req.query, "results": cleaned}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Search failed: {str(e)[:250]}")

@app.post("/api/website-plan")
async def website_plan(req: ChatRequest):
    prompt = (
        "Act as a senior web developer. Create a detailed implementation plan for this website request. "
        "Include pages, components, responsive behavior, accessibility, and files. "
        "Do not claim files have been created. User request: " + req.message
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ]
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            r = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={"model": req.model or DEFAULT_MODEL, "messages": messages, "stream": False},
            )
            r.raise_for_status()
            data = r.json()
        return {"plan": data.get("message", {}).get("content", "")}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Website planner unavailable: {str(e)[:250]}")

app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
