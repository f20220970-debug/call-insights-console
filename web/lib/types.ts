export type Intent =
  | "payment_reminder" | "payment_dispute" | "policy_renewal" | "claim_status"
  | "order_issue" | "refund_request" | "general_query";
export type Sentiment = "positive" | "neutral" | "negative";
export type Status = "queued" | "processing" | "done" | "failed";

export interface Insights {
  summary: string;
  intent: Intent;
  sentiment: Sentiment;
  promise_to_pay: { amount: number | null; due_date: string | null } | null;
  escalation_needed: boolean;
  action_items: string[];
}

export interface Call {
  call_id: string;
  status: Status;
  insights: Insights | null;
  error: string | null;
  attempts: number;
  provider: string | null;
}

export interface CallSummary extends Call {
  domain: string;
  created_at: string;
  transcript_preview: string;
}

export interface Turn { speaker: string; text: string }
export interface Transcript { call_id: string; language: string; domain: string; turns: Turn[] }

export interface Stats {
  by_status: Partial<Record<Status, number>>;
  by_intent: Partial<Record<Intent, number>>;
  by_sentiment: Partial<Record<Sentiment, number>>;
  analysed: number;
  escalation_rate: number;
  promise_to_pay_rate: number;
}

export interface CopilotReply { answer: string; tools_used: { tool: string; args: Record<string, unknown> }[] }

export const INTENTS: Intent[] = [
  "payment_reminder", "payment_dispute", "policy_renewal", "claim_status",
  "order_issue", "refund_request", "general_query",
];

export const label = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
