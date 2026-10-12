import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { allTreesWithWater } from "@/lib/queries";
import { treeHealth } from "@/lib/automations";
import { setTreeStatus } from "@/lib/actions/admin";
import { fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tree stewardship" };

export default async function StewardshipPage() {
  await requireAdmin();
  const rows = await allTreesWithWater();
  const withHealth = rows.map((t) => ({ t, h: treeHealth(t, t.checkIns[0]?.createdAt ?? null) }));
  const overdue = withHealth.filter((x) => !x.h.onTrack && x.t.status !== "DEAD");
  const notAccepted = rows.filter((t) => !t.commitmentAcceptedAt);
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Tree stewardship</h1>
      <p className="text-ink-soft text-sm mt-1 max-w-prose">One row per tree across every project. A tree is &ldquo;on track&rdquo; when its steward has tapped the stake tag within the watering interval. Overdue stewards get an automatic checkpoint message; KHB follows up by phone after two.</p>
      <div className="mt-4 grid grid-cols-3 gap-3 max-w-lg">
        <div className="card p-3"><div className="text-2xl font-bold">{rows.length}</div><div className="text-xs text-ink-soft">trees</div></div>
        <div className="card p-3"><div className="text-2xl font-bold text-[#9a3f0a]">{overdue.length}</div><div className="text-xs text-ink-soft">overdue</div></div>
        <div className="card p-3"><div className="text-2xl font-bold">{notAccepted.length}</div><div className="text-xs text-ink-soft">stewards not accepted</div></div>
      </div>
      <div className="mt-6 card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-ink-soft border-b border-line">
            <tr><th className="px-3 py-2">Tree</th><th className="px-3 py-2">Project</th><th className="px-3 py-2">Steward</th><th className="px-3 py-2">Last watered</th><th className="px-3 py-2">Commitment</th><th className="px-3 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {withHealth.map(({ t, h }) => (
              <tr key={t.id} className={!h.onTrack && t.status !== "DEAD" ? "bg-vest-wash/50" : ""}>
                <td className="px-3 py-2 font-medium whitespace-nowrap"><Link href={`/trees/${t.id}`} className="hover:underline">{t.label}</Link>{t.tags[0] && <span className="text-ink-soft font-normal text-xs"> · {t.tags[0].code}</span>}</td>
                <td className="px-3 py-2"><Link href={`/admin/projects/${t.project.id}`} className="hover:underline">{t.project.title}</Link></td>
                <td className="px-3 py-2">{t.stewardName}<div className="text-xs text-ink-soft">{t.stewardEmail}</div></td>
                <td className="px-3 py-2 whitespace-nowrap">{t.checkIns[0] ? fmtDate(t.checkIns[0].createdAt, { weekday: undefined }) : <span className="text-ink-soft">never</span>}{h.overdueDays ? <div className="text-xs text-[#9a3f0a]">{h.overdueDays}d overdue</div> : <div className="text-xs text-green-deep">on track</div>}</td>
                <td className="px-3 py-2 whitespace-nowrap">{t.commitmentAcceptedAt ? `${h.remainingDays}d left` : <span className="text-[#9a3f0a]">not accepted</span>}</td>
                <td className="px-3 py-2"><div className="flex gap-1">{["PLANTED", "STRUGGLING", "DEAD", "ESTABLISHED"].map((s) => (
                  <form key={s} action={setTreeStatus.bind(null, t.id, s)}><button className={`text-[11px] px-1.5 py-0.5 rounded-sm border ${t.status === s ? "bg-ink text-white border-ink" : "border-line text-ink-soft"}`}>{s.toLowerCase()}</button></form>
                ))}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
