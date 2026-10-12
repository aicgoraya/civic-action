import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { reviewQueue } from "@/lib/queries";
import { StatusChip, HighNeed, fmtDate } from "@/components/ui";
import { PROJECT_TYPE_EMOJI, PROJECT_TYPE_LABEL } from "@/lib/constants";
import type { ProjectStatus } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review queue" };

const GROUPS: { title: string; statuses: ProjectStatus[]; hint: string }[] = [
  { title: "Needs your review", statuses: ["SUBMITTED"], hint: "New submissions. Verify the submitter, confirm the site, add logistics, then approve or decline." },
  { title: "Waiting on submitter", statuses: ["NEEDS_INFO"], hint: "You asked for more information." },
  { title: "Approved, not yet published", statuses: ["APPROVED"], hint: "Publication checks must all pass before these go live." },
  { title: "Live", statuses: ["PUBLISHED"], hint: "Visible to the public. Pending group-lead requests show here." },
  { title: "Completed", statuses: ["COMPLETED"], hint: "" },
  { title: "Declined", statuses: ["DECLINED"], hint: "" },
];

export default async function AdminHome() {
  await requireAdmin();
  const all = await reviewQueue();
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Review queue</h1>
          <p className="text-ink-soft mt-1 text-sm max-w-prose">Nothing is published without a decision made on this screen. Automations only acknowledge, remind and alert.</p>
        </div>
        <div className="text-sm text-ink-soft">{all.filter((p) => p.status === "SUBMITTED").length} new · {all.filter((p) => p.adoptions.some((a) => a.status === "PENDING")).length} group requests</div>
      </div>

      {GROUPS.map((g) => {
        const rows = all.filter((p) => g.statuses.includes(p.status));
        if (!rows.length && !["SUBMITTED", "APPROVED"].includes(g.statuses[0])) return null;
        return (
          <section key={g.title} className="mb-8">
            <h2 className="font-bold">{g.title} <span className="text-ink-soft font-normal">· {rows.length}</span></h2>
            {g.hint && <p className="text-xs text-ink-soft mb-2">{g.hint}</p>}
            <div className="card divide-y divide-line">
              {rows.length === 0 && <p className="px-4 py-3 text-sm text-ink-soft">Nothing here.</p>}
              {rows.map((p) => {
                const pendingAdopt = p.adoptions.filter((a) => a.status === "PENDING").length;
                const stewardsPending = p.type === "TREE_PLANTING" ? p.trees.filter((t) => !t.commitmentAcceptedAt).length : 0;
                return (
                  <Link key={p.id} href={`/admin/projects/${p.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-ground">
                    <span className="text-xl leading-none mt-0.5" aria-hidden>{PROJECT_TYPE_EMOJI[p.type]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{p.title}</span>
                        {p.priorityFlag && <HighNeed small />}
                        {!p.submitterVerified && p.status !== "DECLINED" && <span className="text-[11px] rounded-full bg-amber-100 text-amber-900 px-1.5">Unverified submitter</span>}
                        {pendingAdopt > 0 && <span className="text-[11px] rounded-full bg-sky-100 text-sky-900 px-1.5">{pendingAdopt} group request{pendingAdopt > 1 ? "s" : ""}</span>}
                        {stewardsPending > 0 && <span className="text-[11px] rounded-full bg-vest-wash text-[#9a3f0a] px-1.5">{stewardsPending} steward{stewardsPending > 1 ? "s" : ""} not accepted</span>}
                      </div>
                      <div className="text-xs text-ink-soft mt-0.5">
                        {p.submitterOrg} · {PROJECT_TYPE_LABEL[p.type]}{p.neighborhood ? ` · ${p.neighborhood.name}` : ""} · {fmtDate(p.eventDate)} · {p.signups.length} signed up
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusChip status={p.status} />
                      <div className="text-[11px] text-ink-soft mt-1">submitted {fmtDate(p.createdAt, { hour: undefined, minute: undefined, weekday: undefined })}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
