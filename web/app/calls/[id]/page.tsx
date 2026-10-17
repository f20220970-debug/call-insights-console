import Link from "next/link";
import { getCall, getTranscript, ApiError } from "@/lib/api";
import { label } from "@/lib/types";
import { PromiseToPay, SentimentChip, StatusChip, Unreachable } from "../../components";
import RetryButton from "./retry";

export const dynamic = "force-dynamic";

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [call, transcript] = await Promise.all([getCall(id), getTranscript(id)]);
    const ins = call.insights;
    return (
      <>
        <p><Link href="/calls">All calls</Link></p>
        <h1>{call.call_id}</h1>
        <p className="lede">{label(transcript.domain)} call, language {transcript.language}. <StatusChip s={call.status} /></p>
        <div className="call">
          <section className="turns" aria-label="Transcript">
            {transcript.turns.map((t, i) => (
              <div key={i} className={`turn ${t.speaker.toLowerCase()}`}><small>{label(t.speaker)}</small>{t.text}</div>
            ))}
          </section>
          <aside className="panel">
            {ins ? (
              <dl>
                <dt>Summary</dt><dd>{ins.summary}</dd>
                <dt>Intent</dt><dd>{label(ins.intent)}</dd>
                <dt>Sentiment</dt><dd><SentimentChip s={ins.sentiment} /></dd>
                <dt>Promise to pay</dt><dd><PromiseToPay p={ins.promise_to_pay} /></dd>
                <dt>Escalate</dt><dd>{ins.escalation_needed ? <span className="flag">Yes</span> : "No"}</dd>
                <dt>Next steps</dt>
                <dd>{ins.action_items.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{ins.action_items.map((a) => <li key={a}>{a}</li>)}</ul> : "None"}</dd>
                <dt>Analysed by</dt><dd>{call.provider} ({call.attempts} attempt{call.attempts === 1 ? "" : "s"})</dd>
              </dl>
            ) : call.status === "failed" ? (
              <>
                <p className="note error">Analysis failed: {call.error}</p>
                <RetryButton id={call.call_id} />
              </>
            ) : (
              <p className="note">Analysis is {call.status}. Refresh in a few seconds.</p>
            )}
          </aside>
        </div>
      </>
    );
  } catch (e) {
    return <Unreachable message={e instanceof ApiError && e.status === 404 ? `No call called ${id}.` : e instanceof ApiError ? e.message : "Couldn't load this call."} />;
  }
}
