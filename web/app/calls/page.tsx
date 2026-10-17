import { listCalls, ApiError } from "@/lib/api";
import { INTENTS, label } from "@/lib/types";
import { CallsTable, Unreachable } from "../components";

export const dynamic = "force-dynamic";

type Search = Promise<{ status?: string; intent?: string; escalation?: string }>;

export default async function Calls({ searchParams }: { searchParams: Search }) {
  const f = await searchParams;
  let body: React.ReactNode;
  try {
    body = <CallsTable rows={await listCalls({ ...f, limit: 100 })} />;
  } catch (e) {
    body = <Unreachable message={e instanceof ApiError ? e.message : "Couldn't load calls."} />;
  }
  return (
    <>
      <h1>Calls</h1>
      <p className="lede">Newest first. Filter to find the calls that need action.</p>
      <form className="filters" method="get">
        <label>Status
          <select name="status" defaultValue={f.status ?? ""}>
            <option value="">Any</option>
            {["queued", "processing", "done", "failed"].map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </label>
        <label>Intent
          <select name="intent" defaultValue={f.intent ?? ""}>
            <option value="">Any</option>
            {INTENTS.map((i) => <option key={i} value={i}>{label(i)}</option>)}
          </select>
        </label>
        <label>Escalation
          <select name="escalation" defaultValue={f.escalation ?? ""}>
            <option value="">Any</option>
            <option value="true">Needs escalation</option>
            <option value="false">No escalation</option>
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </form>
      {body}
    </>
  );
}
