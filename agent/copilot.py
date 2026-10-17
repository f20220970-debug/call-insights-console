"""Ops Copilot: a Pydantic AI agent that answers contact-centre questions by calling tools
backed by the Call Insights API (it never answers from memory).

Tools
  get_stats    - totals: calls by status, intent and sentiment; escalation and promise-to-pay rates
  list_calls   - recent calls with optional filters (status, intent, escalation_needed)
  get_call     - one call's insights and full transcript
The model is Gemini (AGENT_MODEL, default gemini-flash-lite-latest) via GEMINI_API_KEY; tests swap in
Pydantic AI's TestModel so no key or network is needed.
"""
import json
import os
from dataclasses import dataclass
from typing import Optional

import httpx
from pydantic_ai import Agent, RunContext
from pydantic_ai.messages import ToolCallPart

API_URL = os.getenv("CALLS_API_URL", "http://localhost:8000")
MODEL_NAME = os.getenv("AGENT_MODEL", "gemini-flash-lite-latest")
INTENTS = ["payment_reminder", "payment_dispute", "policy_renewal", "claim_status", "order_issue",
           "refund_request", "general_query"]

INSTRUCTIONS = f"""You are Ops Copilot for a contact-centre team. Answer questions about analysed customer calls.
Rules:
- Always get facts from the tools; never invent calls, numbers or names. If the tools return nothing, say so.
- Mention call IDs when you refer to specific calls.
- Valid intents: {', '.join(INTENTS)}. Valid statuses: queued, processing, done, failed.
- For "who needs follow-up" questions, list escalated calls and calls with a promise to pay, newest first.
- When asked to draft a follow-up message, read the call with get_call first, then write a short, polite message
  that refers only to what the customer actually said.
- Be concise: short bullet points or 2-4 sentences."""


@dataclass
class Deps:
    http: httpx.AsyncClient


def build_model():
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    from pydantic_ai.models.google import GoogleModel
    from pydantic_ai.providers.google import GoogleProvider
    return GoogleModel(MODEL_NAME, provider=GoogleProvider(api_key=key))


agent = Agent(None, deps_type=Deps, instructions=INSTRUCTIONS, retries=2, defer_model_check=True)


def _compact(c: dict) -> dict:
    ins = c.get("insights") or {}
    return {"call_id": c["call_id"], "status": c["status"], "domain": c.get("domain"), "created_at": c.get("created_at"),
            "intent": ins.get("intent"), "sentiment": ins.get("sentiment"),
            "escalation_needed": ins.get("escalation_needed"), "promise_to_pay": ins.get("promise_to_pay"),
            "summary": ins.get("summary"), "error": c.get("error")}


@agent.tool
async def get_stats(ctx: RunContext[Deps]) -> dict:
    """Totals across all calls: counts by status, intent and sentiment, plus escalation and promise-to-pay rates."""
    r = await ctx.deps.http.get("/v1/stats")
    r.raise_for_status()
    return r.json()


@agent.tool
async def list_calls(ctx: RunContext[Deps], status: Optional[str] = None, intent: Optional[str] = None,
                     escalation_needed: Optional[bool] = None, limit: int = 10) -> list[dict]:
    """Recent calls, newest first. Filter by status (queued/processing/done/failed), intent, or escalation_needed.

    Args:
        status: job status filter.
        intent: one of the valid intents.
        escalation_needed: true to return only calls flagged for escalation.
        limit: how many calls to return (1-50).
    """
    params = {"limit": max(1, min(limit, 50))}
    if status:
        params["status"] = status
    if intent:
        params["intent"] = intent
    if escalation_needed is not None:
        params["escalation"] = str(escalation_needed).lower()
    r = await ctx.deps.http.get("/v1/calls", params=params)
    r.raise_for_status()
    return [_compact(c) for c in r.json()]


@agent.tool
async def get_call(ctx: RunContext[Deps], call_id: str) -> dict:
    """One call's insights plus its full transcript.

    Args:
        call_id: the call's id, e.g. bank-001.
    """
    r = await ctx.deps.http.get(f"/v1/calls/{call_id}")
    if r.status_code == 404:
        return {"error": f"call {call_id} not found"}
    r.raise_for_status()
    t = await ctx.deps.http.get(f"/v1/calls/{call_id}/transcript")
    out = _compact(r.json())
    out["transcript"] = t.json().get("turns", []) if t.status_code == 200 else []
    return out


def tools_used(result) -> list[dict]:
    calls = []
    for m in result.all_messages():
        for p in getattr(m, "parts", []):
            if isinstance(p, ToolCallPart):
                args = p.args if isinstance(p.args, dict) else json.loads(p.args or "{}")
                calls.append({"tool": p.tool_name, "args": args})
    return calls


async def ask(question: str, history: list[dict], http: httpx.AsyncClient, model=None) -> dict:
    """Run the agent on a question (recent chat turns are included as context)."""
    context = "\n".join(f"{h['role'].upper()}: {h['content']}" for h in history[-6:])
    prompt = (f"Earlier conversation:\n{context}\n\nNew question: {question}" if context else question)
    result = await agent.run(prompt, deps=Deps(http), model=model or build_model())
    return {"answer": result.output, "tools_used": tools_used(result)}
