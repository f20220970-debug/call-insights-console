import Link from "next/link";
import type { CallSummary, Insights } from "@/lib/types";
import { label } from "@/lib/types";

export function SentimentChip({ s }: { s?: string | null }) {
  return s ? <span className={`chip s-${s}`}>{label(s)}</span> : <span className="chip s-neutral">—</span>;
}

export function StatusChip({ s }: { s: string }) {
  return <span className={`chip st-${s}`}>{label(s)}</span>;
}

export function PromiseToPay({ p }: { p: Insights["promise_to_pay"] }) {
  if (!p) return <>—</>;
  const amt = p.amount != null ? `₹${p.amount.toLocaleString("en-IN")}` : "Amount not stated";
  return <>{amt}{p.due_date ? ` by ${p.due_date}` : ""}</>;
}

export function CallsTable({ rows }: { rows: CallSummary[] }) {
  if (!rows.length) return <p className="note">No calls match. Add one, or clear the filters.</p>;
  return (
    <div className="wrap">
      <table>
        <thead>
          <tr><th>Call</th><th>Intent</th><th>Sentiment</th><th>Promise to pay</th><th>Escalate</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.call_id}>
              <td><Link href={`/calls/${c.call_id}`}>{c.call_id}</Link><br /><small>{c.transcript_preview}</small></td>
              <td>{c.insights ? label(c.insights.intent) : "—"}</td>
              <td><SentimentChip s={c.insights?.sentiment} /></td>
              <td><PromiseToPay p={c.insights?.promise_to_pay ?? null} /></td>
              <td>{c.insights?.escalation_needed ? <span className="flag">Yes</span> : "No"}</td>
              <td><StatusChip s={c.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Unreachable({ message }: { message: string }) {
  return <p className="note error">{message}</p>;
}
