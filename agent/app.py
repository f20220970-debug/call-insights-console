"""Agent service.  POST /chat {"message": "...", "history": [{"role": "user"|"assistant", "content": "..."}]}"""
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import copilot

app = FastAPI(title="Ops Copilot", version="1.0.0")


class Msg(BaseModel):
    role: str
    content: str


class ChatIn(BaseModel):
    message: str = Field(..., min_length=2, max_length=2000)
    history: list[Msg] = Field(default_factory=list)


@app.post("/chat")
async def chat(body: ChatIn):
    try:
        async with httpx.AsyncClient(base_url=copilot.API_URL, timeout=20) as http:
            return await copilot.ask(body.message, [h.model_dump() for h in body.history], http)
    except RuntimeError as e:                     # missing key
        raise HTTPException(503, str(e))
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Call Insights API unavailable: {e}")


@app.get("/health")
async def health():
    return {"status": "ok", "model": copilot.MODEL_NAME, "calls_api": copilot.API_URL}
