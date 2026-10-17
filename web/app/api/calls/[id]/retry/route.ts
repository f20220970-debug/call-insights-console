import { forward } from "@/lib/api";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forward(`/v1/calls/${encodeURIComponent(id)}/retry`, { method: "POST" });
}
