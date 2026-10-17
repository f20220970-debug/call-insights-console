import Link from "next/link";
import { getStats, listCalls, ApiError } from "@/lib/api";
import { label } from "@/lib/types";
import { CallsTable, Unreachable } from "./components";

export const dynamic = "force-dynamic";

function Bars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  if (!entries.length) return <p className="note">Nothing analysed yet.</p>;
  return (
    <div className="bars">
      {entries.map(([k, n]) => (
        <div className="bar" key={k}>
          <span>{label(k)}</span>
          <i style={{ width: `${(100 * n) / max}%` }} aria-hidden />
          <em>{n}</em>
        </div>
      ))}
    </div>
  );
}

export default async function Overview() {
  try {
    const [stats, escalated, promises] = await Promise.all([
      getStats(),
      listCalls({ escalation: "true", limit: 6 }),
      listCalls({ status: "done", limit: 50 }),
    ]);
    const promised = promises.filter((c) => c.insights?.promise_to_pay).slice(0, 6);
    const pct = (x: number) => `${Math.round(100 * x)}%`;
    return (
      <>
        <h1>Overview</h1>
        <p className="lede">Every analysed call, and the ones that need a person today.</p>
        <section className="figures" aria-label="Totals">
          <div className="figure"><b>{stats.analysed}</b><span>calls analysed</span></div>
          <div className="figure"><b>{pct(stats.escalation_rate)}</b><span>need escalation</span></div>
          <div className="figure"><b>{pct(stats.promise_to_pay_rate)}</b><span>promised to pay</span></div>
          <div className="figure"><b>{stats.by_status.failed ?? 0}</b><span>failed analyses</span></div>
        </section>
        <div className="split">
          <section>
            <h2>Escalations waiting</h2>
            <CallsTable rows={escalated} />
            <p><Link href="/calls?escalation=true">All escalated calls</Link></p>
          </section>
          <section>
            <h2>Why customers called</h2>
            <Bars data={stats.by_intent as Record<string, number>} />
            <h2>How they felt by the end</h2>
            <Bars data={stats.by_sentiment as Record<string, number>} />
          </section>
        </div>
        <h2>Promises to pay</h2>
        <CallsTable rows={promised} />
      </>
    );
  } catch (e) {
    return (<><h1>Overview</h1><Unreachable message={e instanceof ApiError ? e.message : "Something went wrong loading the overview."} /></>);
  }
}
