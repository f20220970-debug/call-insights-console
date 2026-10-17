// Server-side helpers: the browser never talks to the backends directly.
import type { CallSummary, Call, Stats, Transcript } from "./types";

const CALLS_API = process.env.CALLS_API_URL ?? "http://localhost:8000";
export const AGENT_API = process.env.AGENT_URL ?? "http://localhost:8100";

export class ApiError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${CALLS_API}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(`Can't reach the Call Insights API at ${CALLS_API}. Start it, or set CALLS_API_URL.`);
  }
  if (!res.ok) throw new ApiError(`Call Insights API returned ${res.status} for ${path}`, res.status);
  return res.json() as Promise<T>;
}

export const getStats = () => get<Stats>("/v1/stats");
export const getCall = (id: string) => get<Call>(`/v1/calls/${encodeURIComponent(id)}`);
export const getTranscript = (id: string) => get<Transcript>(`/v1/calls/${encodeURIComponent(id)}/transcript`);

export function listCalls(filters: { status?: string; intent?: string; escalation?: string; limit?: number } = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== "") q.set(k, String(v));
  return get<CallSummary[]>(`/v1/calls?${q.toString()}`);
}

export async function forward(path: string, init: RequestInit, base = CALLS_API): Promise<Response> {
  try {
    const res = await fetch(`${base}${path}`, { ...init, cache: "no-store" });
    return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json" } });
  } catch {
    return Response.json({ detail: `Can't reach ${base}` }, { status: 502 });
  }
}
