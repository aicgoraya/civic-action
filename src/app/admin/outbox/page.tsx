import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { outbox } from "@/lib/queries";
import { runAutomationsNow } from "@/lib/actions/admin";
import { fmtDate, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Outbox" };

const KIND_LABEL: Record<string, string> = {
  SUBMISSION_ACK: "Submission acknowledged", REVIEWER_ALERT: "Reviewer alert", INFO_REQUEST: "Info requested",
  APPROVED: "Approved", DECLINED: "Declined", PUBLISHED: "Published", ADOPTION_RECEIVED: "Group request received",
  ADOPTION_DECISION: "Group request decision", SIGNUP_CONFIRMATION: "Sign-up confirmed", EVENT_REMINDER: "Event reminder (48h)",
  TREE_CHECKPOINT: "Tree watering checkpoint", STEWARD_WELCOME: "Steward commitment request",
};

export default async function OutboxPage({ searchParams }: { searchParams: Promise<{ ran?: string; reminders?: string; checkpoints?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const rows = await outbox();
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Outbox</h1>
          <p className="text-ink-soft text-sm mt-1 max-w-prose">Every automated message the system sent. In production these go out by email/SMS; the prototype records them here so you can see exactly what automation does — and that none of it approves or publishes anything.</p>
        </div>
        <form action={runAutomationsNow}><button className="btn-secondary text-sm">Run scheduled checks now</button></form>
      </div>
      {sp.ran && <div className="mb-4"><Notice tone="success">Ran scheduled checks: {sp.reminders} event reminder(s), {sp.checkpoints} tree checkpoint(s) sent. (Vercel Cron runs this daily at 7am.)</Notice></div>}
      <ul className="card divide-y divide-line">
        {rows.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft">Nothing sent yet.</li>}
        {rows.map((n) => (
          <li key={n.id} className="px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs rounded-full bg-ground border border-line px-2 py-0.5">{KIND_LABEL[n.kind] ?? n.kind}</span>
              <span className="text-ink-soft">to {n.to}</span>
              <span className="ml-auto text-xs text-ink-soft">{fmtDate(n.createdAt, { weekday: undefined })}</span>
            </div>
            <div className="font-medium mt-1">{n.subject}</div>
            <details className="mt-1">
              <summary className="text-xs text-ink-soft cursor-pointer">Body{n.project ? <> · <Link href={`/admin/projects/${n.project.id}`} className="underline">{n.project.title}</Link></> : null}</summary>
              <p className="mt-1 whitespace-pre-line text-ink-soft">{n.body}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
