# Call Insights Console + Ops Copilot

**Live demo:** https://call-insights-console.vercel.app (free hosting: the first load can take up to a minute while the servers wake up)

A full-stack front end and an AI agent for the [Call Insights API](https://github.com/f20220970-debug/call-insights-api):

- **`web/`: Next.js 15 + TypeScript console.** Overview (totals, escalations waiting, promises to pay, intent and
  sentiment breakdowns), a filterable calls list, call detail (transcript as a conversation beside the extracted
  insights, with a retry button for failed analyses), a form to add calls, and a chat page for the copilot.
  Server components fetch from the backends; the browser only talks to Next.js route handlers.
- **`agent/`: Ops Copilot, a Pydantic AI agent** served by FastAPI. It answers questions such as "which calls need
  escalation?" or "draft a follow-up for bank-003" by **calling tools** (`get_stats`, `list_calls`, `get_call`) that
  query the Call Insights API, so answers come from live data, not the model's memory. Each reply lists the tools
  and arguments it used, and the console shows them under the answer.

```
browser ──► Next.js (server components + /api route handlers)
               ├──► Call Insights API (FastAPI · MongoDB · Redis · LLM worker)
               └──► Ops Copilot (FastAPI · Pydantic AI · Gemini) ──tools──► Call Insights API
```

## Run it locally
1. Start the Call Insights API (in its repo): `docker compose up --build`, then `python scripts/load_samples.py`.
2. Start the copilot:
   ```bash
   cd agent && python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
   GEMINI_API_KEY=... uvicorn app:app --port 8100
   ```
3. Start the console:
   ```bash
   cd web && npm install && cp .env.example .env.local && npm run dev
   ```
   Open http://localhost:3000.

## Tests and CI
- `agent/tests`: tool wiring with Pydantic AI's `TestModel` (calls every tool) and a scripted `FunctionModel`
  (checks the filtered `list_calls` call, missing-call handling and the final answer), against a mocked API
  (httpx `MockTransport`). No API key or network needed.
- `web/`: TypeScript type-check, Vitest unit tests for transcript parsing, and a production build.
- GitHub Actions runs both on every push.

## Design notes
- One accent colour for actions; red, grey and green carry meaning (negative, neutral, positive sentiment) and
  nothing else. Supports light and dark mode, keyboard focus and narrow screens.
- Errors say what to do next (for example, start the API or set `GEMINI_API_KEY`), never just "something went wrong".
