"use client";
import { useState } from "react";
import type { CopilotReply } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string; tools?: CopilotReply["tools_used"] };

const SUGGESTIONS = [
  "Which calls need escalation, and why?",
  "Who promised to pay this week, and how much?",
  "What are customers calling about most?",
  "Draft a follow-up message for bank-003.",
];

export default function Copilot() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    const history = msgs.map(({ role, content }) => ({ role, content }));
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/copilot", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, history }) });
      const data = await res.json();
      const reply: Msg = res.ok
        ? { role: "assistant", content: (data as CopilotReply).answer, tools: (data as CopilotReply).tools_used }
        : { role: "assistant", content: `The copilot couldn't answer (${res.status}): ${data.detail ?? "unknown error"}` };
      setMsgs((m) => [...m, reply]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Can't reach the copilot service. Start it and try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Ops Copilot</h1>
      <p className="lede">Ask about analysed calls. The copilot looks up live data with its tools and shows which ones it used.</p>
      <div className="chat">
        {!msgs.length && (
          <div className="suggest">{SUGGESTIONS.map((s) => <button key={s} className="ghost" onClick={() => ask(s)}>{s}</button>)}</div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.content}
            {m.tools && m.tools.length > 0 && (
              <div className="tools">Looked up: {m.tools.map((t, j) => <code key={j}>{t.tool}({Object.entries(t.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}) </code>)}</div>
            )}
          </div>
        ))}
        {busy && <div className="msg">Looking that up…</div>}
        <form className="composer" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
          <input aria-label="Ask the copilot" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about calls, escalations or promises to pay" />
          <button type="submit" disabled={busy || !input.trim()}>Ask</button>
        </form>
      </div>
    </>
  );
}
