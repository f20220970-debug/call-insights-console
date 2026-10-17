"""Agent wiring tests: a fake Call Insights API (httpx MockTransport) and Pydantic AI's TestModel."""
import httpx
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_ai.messages import ModelResponse, TextPart, ToolCallPart
from pydantic_ai.models.test import TestModel

import copilot

CALLS = [
    {"call_id": "bank-003", "status": "done", "domain": "banking", "created_at": "2026-10-14T10:00:00",
     "insights": {"summary": "Customer angry about calls, wants manager.", "intent": "payment_reminder",
                  "sentiment": "negative", "promise_to_pay": None, "escalation_needed": True, "action_items": []}},
    {"call_id": "bank-001", "status": "done", "domain": "banking", "created_at": "2026-10-14T09:00:00",
     "insights": {"summary": "Will pay EMI Friday.", "intent": "payment_reminder", "sentiment": "neutral",
                  "promise_to_pay": {"amount": 4500, "due_date": "2026-10-16"}, "escalation_needed": False, "action_items": []}},
]
seen = []


def fake_api(request: httpx.Request) -> httpx.Response:
    seen.append((request.url.path, dict(request.url.params)))
    path = request.url.path
    if path == "/v1/stats":
        return httpx.Response(200, json={"analysed": 2, "escalation_rate": 0.5, "promise_to_pay_rate": 0.5,
                                         "by_status": {"done": 2}, "by_intent": {"payment_reminder": 2}, "by_sentiment": {}})
    if path == "/v1/calls":
        rows = CALLS
        if request.url.params.get("escalation") == "true":
            rows = [c for c in CALLS if c["insights"]["escalation_needed"]]
        return httpx.Response(200, json=rows)
    if path.endswith("/transcript"):
        return httpx.Response(200, json={"turns": [{"speaker": "customer", "text": "I want your manager."}]})
    cid = path.rsplit("/", 1)[-1]
    match = [c for c in CALLS if c["call_id"] == cid]
    return httpx.Response(200, json=match[0]) if match else httpx.Response(404, json={"detail": "not found"})


def client():
    return httpx.AsyncClient(transport=httpx.MockTransport(fake_api), base_url="http://api")


async def test_all_tools_callable_with_test_model():
    seen.clear()
    async with client() as http:
        out = await copilot.ask("give me an overview", [], http, model=TestModel(call_tools="all"))
    names = {t["tool"] for t in out["tools_used"]}
    assert names == {"get_stats", "list_calls", "get_call"}
    assert any(p == "/v1/stats" for p, _ in seen)


async def test_escalation_question_uses_filtered_tool():
    """A scripted model: first calls list_calls(escalation_needed=True), then answers from the result."""
    def script(messages, info: AgentInfo):
        if len(messages) == 1:
            return ModelResponse(parts=[ToolCallPart("list_calls", {"escalation_needed": True, "limit": 5})])
        tool_result = messages[-1].parts[0].content
        ids = ", ".join(c["call_id"] for c in tool_result)
        return ModelResponse(parts=[TextPart(f"Escalated calls: {ids}")])

    seen.clear()
    async with client() as http:
        out = await copilot.ask("which calls need escalation?", [], http, model=FunctionModel(script))
    assert out["answer"] == "Escalated calls: bank-003"
    assert ("/v1/calls", {"limit": "5", "escalation": "true"}) in seen
    assert out["tools_used"] == [{"tool": "list_calls", "args": {"escalation_needed": True, "limit": 5}}]


async def test_get_call_includes_transcript_and_handles_missing():
    def script(messages, info):
        if len(messages) == 1:
            return ModelResponse(parts=[ToolCallPart("get_call", {"call_id": "bank-003"}),
                                        ToolCallPart("get_call", {"call_id": "nope-999"})])
        found, missing = messages[-1].parts[0].content, messages[-1].parts[1].content
        return ModelResponse(parts=[TextPart(f"{found['transcript'][0]['text']} | {missing['error']}")])

    async with client() as http:
        out = await copilot.ask("draft a follow-up for bank-003", [], http, model=FunctionModel(script))
    assert out["answer"] == "I want your manager. | call nope-999 not found"


def test_missing_key_is_a_clear_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    try:
        copilot.build_model()
        assert False
    except RuntimeError as e:
        assert "GEMINI_API_KEY" in str(e)
