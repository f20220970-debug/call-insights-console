import { AGENT_API, forward } from "@/lib/api";

export async function POST(req: Request) {
  return forward("/chat", { method: "POST", headers: { "content-type": "application/json" }, body: await req.text() }, AGENT_API);
}
