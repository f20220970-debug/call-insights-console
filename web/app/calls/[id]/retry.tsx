"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RetryButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function retry() {
    setBusy(true);
    const res = await fetch(`/api/calls/${encodeURIComponent(id)}/retry`, { method: "POST" });
    setBusy(false);
    if (res.ok) { setMsg("Queued again. Refreshing…"); setTimeout(() => router.refresh(), 2500); }
    else setMsg(`Retry failed (${res.status}).`);
  }
  return (<p><button onClick={retry} disabled={busy}>{busy ? "Retrying…" : "Retry analysis"}</button> {msg}</p>);
}
