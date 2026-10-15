"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Card = { title: string; sub: string; href: string };
type Msg = { who: "u" | "h"; text: string; cards?: Card[] };

const CHIPS = ["Find a cleanup near me", "How do I adopt a tree?", "Status of my project", "Report illegal dumping", "Talk to a person"];

export function Hou() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { logRef.current?.scrollTo({ top: 1e6 }); }, [log, busy]);
  useEffect(() => { if (open && !busy) inputRef.current?.focus(); }, [open, busy]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- open from a #hou deep link after hydration
  useEffect(() => { if (typeof window !== "undefined" && window.location.hash === "#hou") setOpen(true); }, []);

  if (pathname?.startsWith("/live") || pathname?.startsWith("/admin")) return null;

  async function ask(text: string) {
    text = text.trim(); if (!text || busy) return;
    setLog((l) => [...l, { who: "u", text }]); setQ(""); setBusy(true);
    const started = Date.now();
    try {
      const r = await fetch("/api/hou", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: text }) }).then((r) => r.json());
      await new Promise((res) => setTimeout(res, Math.max(0, 600 + Math.min(1200, text.length * 20) - (Date.now() - started))));
      setLog((l) => [...l, { who: "h", text: r.text, cards: r.cards }]);
      // eslint-disable-next-line react-hooks/purity -- fake ticket number, event handler
      if (r.handoff) setTimeout(() => setLog((l) => [...l, { who: "h", text: `Ticket #KHB-${Math.floor(1000 + Math.random() * 9000)} created. A staff member will follow up by email within one business day.` }]), 1800);
    } catch {
      setLog((l) => [...l, { who: "h", text: "I couldn't reach the platform just now. Try again in a moment." }]);
    } finally { setBusy(false); }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-ink text-white pl-3 pr-4 py-2.5 text-sm font-semibold shadow-[0_8px_28px_rgba(0,0,0,.22)]" aria-label="Ask Hou">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-green text-[13px]">H</span>Ask Hou
    </button>
  );

  return (
    <div role="dialog" aria-label="Hou assistant" className="fixed right-4 bottom-4 z-50 flex w-[min(380px,calc(100vw-32px))] h-[min(560px,calc(100vh-100px))] flex-col overflow-hidden rounded-xl border border-line bg-paper shadow-[0_16px_48px_rgba(0,0,0,.25)]">
      <div className="flex items-center gap-2.5 border-b border-line bg-ink px-3.5 py-3 text-white">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-green text-[15px]">H</span>
        <div><div className="font-bold leading-tight">Hou</div><div className="text-[11px] opacity-70">KHB assistant · prototype</div></div>
        <button onClick={() => setOpen(false)} className="ml-auto text-xl leading-none opacity-70 px-1" aria-label="Close">×</button>
      </div>
      <div ref={logRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-ground p-3.5">
        {log.length === 0 && <div className="max-w-[88%] self-start rounded-xl rounded-bl-sm border border-line bg-paper px-3 py-2 text-sm">Hi, I&apos;m Hou. I can find you a cleanup, explain tree stewardship, check on a project you submitted, or get you to a person at KHB.</div>}
        {log.map((m, i) => m.who === "u" ? (
          <div key={i} className="max-w-[88%] self-end rounded-xl rounded-br-sm bg-green px-3 py-2 text-sm text-white whitespace-pre-line">{m.text}</div>
        ) : (
          <div key={i} className="max-w-[88%] self-start rounded-xl rounded-bl-sm border border-line bg-paper px-3 py-2 text-sm whitespace-pre-line">
            {m.text}
            {m.cards?.map((c) => (
              <Link key={c.href + c.title} href={c.href} onClick={() => setOpen(false)} className="mt-1.5 block rounded-lg border border-line bg-ground px-2.5 py-2 text-[13px] no-underline"><b className="block">{c.title}</b><span className="text-xs text-ink-soft">{c.sub}</span></Link>
            ))}
          </div>
        ))}
        {busy && <div className="flex gap-1 self-start rounded-xl border border-line bg-paper px-3 py-2.5"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-soft" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-soft [animation-delay:150ms]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-soft [animation-delay:300ms]" /></div>}
      </div>
      <div className="flex flex-wrap gap-1.5 bg-ground px-3.5 pb-2">
        {CHIPS.map((c) => <button key={c} onClick={() => ask(c)} className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs hover:border-green hover:text-green">{c}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2 border-t border-line bg-paper p-2.5">
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} disabled={busy} placeholder="Ask anything…" autoComplete="off" className="flex-1 rounded-full border border-line bg-ground px-3.5 py-2 text-[15px] focus:border-green focus:outline-none" />
        <button type="submit" aria-label="Send" className="h-10 w-10 rounded-full bg-green text-lg text-white">↑</button>
      </form>
      <p className="bg-paper px-2.5 pb-2 text-center text-[10px] text-ink-soft">Scripted prototype — answers come from the platform&apos;s own project data. A production Hou would run on a hosted model with the same guardrails: it can look things up and hand off to staff, never approve or publish.</p>
    </div>
  );
}
