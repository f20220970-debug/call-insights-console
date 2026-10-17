import type { Turn } from "./types";

// Turns "Agent: ... / Customer: ..." lines into transcript turns. Lines without a
// speaker prefix are appended to the previous turn.
export function parseTranscript(text: string): Turn[] {
  const turns: Turn[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(agent|customer|caller|rep)\s*:\s*(.+)$/i);
    if (m) {
      const who = m[1].toLowerCase();
      turns.push({ speaker: who === "caller" ? "customer" : who === "rep" ? "agent" : who, text: m[2].trim() });
    } else if (turns.length) {
      turns[turns.length - 1].text += ` ${line}`;
    }
  }
  return turns;
}

export const validCallId = (id: string) => /^[A-Za-z0-9_-]{3,64}$/.test(id);
