"use client";
import Link from "next/link";
import { useState } from "react";
import { parseTranscript, validCallId } from "@/lib/parse";

const EXAMPLE = "Agent: Your EMI of Rs 6,200 is overdue.\nCustomer: Sorry, I will pay Rs 6,200 on Monday.\nAgent: Thank you, noted.";

export default function Submit() {
  const [callId, setCallId] = useState("");
  const [domain, setDomain] = useState("banking");
  const [text, setText] = useState(EXAMPLE);
  const [state, setState] = useState<{ kind: "idle" | "busy" | "ok" | "error"; msg?: string }>({ kind: "idle" });
  const turns = parseTranscript(text);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validCallId(callId)) return setState({ kind: "error", msg: "Call ID: 3-64 letters, numbers, - or _." });
    if (!turns.length) return setState({ kind: "error", msg: "Add at least one line starting with Agent: or Customer:." });
    setState({ kind: "busy" });
    const res = await fetch("/api/calls", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ call_id: callId, domain, language: "en", turns }) });
    if (res.status === 202) setState({ kind: "ok" });
    else if (res.status === 409) setState({ kind: "error", msg: "That call ID already exists. Choose another." });
    else setState({ kind: "error", msg: `The API returned ${res.status}. Check the transcript and try again.` });
  }

  return (
    <>
      <h1>Add a call</h1>
      <p className="lede">Paste a transcript with one line per turn, starting with Agent: or Customer:. It is analysed in the background.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 14, maxWidth: 720 }}>
        <div className="filters">
          <label>Call ID<input value={callId} onChange={(e) => setCallId(e.target.value)} placeholder="bank-011" required /></label>
          <label>Domain
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              <option value="banking">Banking</option><option value="insurance">Insurance</option><option value="ecommerce">E-commerce</option>
            </select>
          </label>
        </div>
        <label>Transcript<textarea value={text} onChange={(e) => setText(e.target.value)} /></label>
        <p style={{ margin: 0, color: "var(--muted)" }}>{turns.length} turn{turns.length === 1 ? "" : "s"} detected.</p>
        <div><button type="submit" disabled={state.kind === "busy"}>{state.kind === "busy" ? "Adding…" : "Add call"}</button></div>
        {state.kind === "ok" && <p className="note">Added. <Link href={`/calls/${callId}`}>Open {callId}</Link> to see the analysis.</p>}
        {state.kind === "error" && <p className="note error">{state.msg}</p>}
      </form>
    </>
  );
}
