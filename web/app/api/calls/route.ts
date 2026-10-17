import { forward } from "@/lib/api";

export async function POST(req: Request) {
  return forward("/v1/calls", { method: "POST", headers: { "content-type": "application/json" }, body: await req.text() });
}
