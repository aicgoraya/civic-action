import Link from "next/link";
import { notFound } from "next/navigation";
import { treeById } from "@/lib/queries";
import { fmtDate, Dl } from "@/components/ui";
import { treeHealth } from "@/lib/automations";

export const dynamic = "force-dynamic";

export default async function TreePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await treeById(id);
  if (!t) notFound();
  const waterings = t.checkIns.filter((c) => c.kind === "TREE_WATERING");
  const h = treeHealth(t, waterings[0]?.createdAt ?? null);
  const tag = t.tags[0];

  return (
    <div className="mx-auto max-w-xl px-4 pt-6">
      <Link href={`/projects/${t.projectId}`} className="text-sm text-ink-soft hover:text-ink">← {t.project.title}</Link>
      <h1 className="mt-3 text-2xl font-bold">🌳 {t.label}</h1>
      <p className="text-ink-soft">{t.species ?? "Tree"} · {t.project.address}</p>

      <div className="mt-5 card p-4">
        <Dl items={[
          ["Status", <span key="s" className={`font-medium ${h.onTrack ? "text-green-deep" : "text-[#9a3f0a]"}`}>{t.status === "DEAD" ? "Dead — replacement needed" : h.onTrack ? "On track" : `Watering ${h.overdueDays} day(s) overdue`}</span>],
          ["Steward", <>{t.stewardName} <span className="text-ink-soft">({t.stewardEmail})</span></>],
          ["Commitment", t.commitmentAcceptedAt ? `Accepted ${fmtDate(t.commitmentAcceptedAt, { hour: undefined, minute: undefined, weekday: undefined })} · ${h.remainingDays} days remaining` : "Not yet accepted"],
          ["Planted", t.plantedAt ? fmtDate(t.plantedAt, { hour: undefined, minute: undefined, weekday: undefined }) : "—"],
          ["Watering schedule", `Every ${t.wateringIntervalDays} days`],
          ["Waterings logged", waterings.length],
          ["Tag", tag ? <Link key="t" href={`/t/${tag.code}`} className="text-green underline">{tag.code}</Link> : "—"],
        ]} />
      </div>

      <h2 className="mt-8 text-lg font-bold">Care history</h2>
      <ul className="mt-2 card divide-y divide-line text-sm">
        {t.checkIns.length === 0 && <li className="px-4 py-3 text-ink-soft">Nothing logged yet.</li>}
        {t.checkIns.map((c) => (
          <li key={c.id} className="px-4 py-2.5 flex gap-3">
            <span className="text-ink-soft w-32 shrink-0">{fmtDate(c.createdAt, { weekday: undefined })}</span>
            <span><strong>{c.name}</strong> {c.kind === "TREE_WATERING" ? "watered" : "reported an issue"}{c.note ? ` — ${c.note}` : ""}</span>
          </li>
        ))}
      </ul>
      {tag && <Link href={`/t/${tag.code}`} className="btn-primary mt-6">Log a watering</Link>}
    </div>
  );
}
