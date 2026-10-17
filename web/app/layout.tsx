import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Call Insights Console",
  description: "Review analysed contact-centre calls and ask the Ops Copilot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="side">
            <p className="brand">Call Insights<small>Contact-centre console</small></p>
            <nav className="nav" aria-label="Main">
              <Link href="/">Overview</Link>
              <Link href="/calls">Calls</Link>
              <Link href="/submit">Add a call</Link>
              <Link href="/copilot">Ops Copilot</Link>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
