import Link from "next/link";
import { notFound } from "next/navigation";
import { tagByCode } from "@/lib/queries";
import { recordTap } from "@/lib/actions/public";
import { CheckInForm } from "@/components/forms/SmallForms";
import { fmtDate, Notice } from "@/components/ui";
import { treeHealth, lastWatering } from "@/lib/automations";
import { PROJECT_TYPE_EMOJI } from "@/lib/constants";

export const dynamic = "force-dynamic";

// This is the page a phone opens when it taps an NFC sticker.
// It has to be fast, legible in sunlight, and usable one-handed.
export default async function TagPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ done?: string }> }) {
  const { code } = await params;
  const { done } = await searchParams;
  const tag = await tagByCode(code);
  if (!tag) notFound();
  if (!done) await recordTap(code);

  const project = tag.project ?? tag.tree?.project ?? null;
  const tree = tag.tree ?? null;
  const last = tree ? await lastWatering(tree.id) : null;
  const h = tree ? treeHealth(tree, last) : null;

  return (
    <div className="mx-auto max-w-md px-4 pt-5 pb-10">
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <span className="inline-flex h-5 items-center rounded-full bg-ink text-white px-2 font-medium">Tag {tag.code}</span>
        <span>{tag.label}</span>
      </div>

      {done === "VOLUNTEER_CHECKIN" && <div className="mt-4"><Notice tone="success"><strong>Checked in.</strong> Thanks for showing up. Grab gloves and a bag at the staging table.</Notice></div>}
      {done === "TREE_WATERING" && <div className="mt-4"><Notice tone="success"><strong>Watering logged.</strong> This tree&apos;s record is updated and KHB&apos;s dashboard reflects it.</Notice></div>}
      {done === "ISSUE_REPORT" && <div className="mt-4"><Notice tone="warn"><strong>Reported.</strong> KHB staff have been alerted and will follow up.</Notice></div>}

      {tree && project ? (
        <>
          <h1 className="mt-4 text-2xl font-bold leading-tight">🌳 {tree.label}</h1>
          <p className="text-ink-soft">{tree.species ?? "Tree"} · {project.title}</p>

          <div className={`mt-4 rounded-sm border p-4 ${h!.onTrack ? "bg-green-wash border-green/30" : "bg-vest-wash border-vest/40"}`}>
            <div className="text-sm text-ink-soft">Last watered</div>
            <div className="text-xl font-bold">{last ? (h!.daysSinceWater === 0 ? "Today" : `${h!.daysSinceWater} days ago`) : "Never logged"}</div>
            <div className="text-sm mt-1">{h!.onTrack ? "On schedule." : `${h!.overdueDays} day(s) overdue — please water now.`}</div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-ink-soft">Steward</dt><dd className="font-medium">{tree.stewardName}</dd></div>
              <div><dt className="text-ink-soft">Schedule</dt><dd className="font-medium">Every {tree.wateringIntervalDays} days</dd></div>
              <div><dt className="text-ink-soft">Planted</dt><dd className="font-medium">{tree.plantedAt ? fmtDate(tree.plantedAt, { hour: undefined, minute: undefined, weekday: undefined }) : "—"}</dd></div>
              <div><dt className="text-ink-soft">Commitment left</dt><dd className="font-medium">{h!.remainingDays != null ? `${h!.remainingDays} days` : "Not accepted"}</dd></div>
            </dl>
          </div>

          {done !== "TREE_WATERING" && (
            <div className="mt-5 card p-4">
              <h2 className="font-semibold mb-3">I just watered this tree</h2>
              <CheckInForm code={tag.code} kind="TREE_WATERING" label="Log watering" placeholder="Looks healthy / new leaves / soil was dry…" />
            </div>
          )}
          <details className="mt-3 card p-4">
            <summary className="font-semibold cursor-pointer">Something&apos;s wrong with this tree</summary>
            <div className="mt-3">
              <CheckInForm code={tag.code} kind="ISSUE_REPORT" label="Report to KHB" placeholder="Broken stake, leaves browning, tree gone…" />
            </div>
          </details>
          <Link href={`/trees/${tree.id}`} className="block mt-4 text-sm text-green font-medium">Full care history →</Link>
        </>
      ) : project ? (
        <>
          <h1 className="mt-4 text-2xl font-bold leading-tight">{PROJECT_TYPE_EMOJI[project.type]} {project.title}</h1>
          <p className="text-ink-soft">{project.address}</p>
          <p className="text-sm mt-1">{fmtDate(project.eventDate)}{project.adoptedByOrg ? ` · led by ${project.adoptedByOrg}` : ""}</p>

          {done !== "VOLUNTEER_CHECKIN" && (
            <div className="mt-5 card p-4">
              <h2 className="font-semibold">Check in</h2>
              <p className="text-sm text-ink-soft mb-3">Confirms you&apos;re here and that you&apos;ve seen the safety briefing.</p>
              {project.safetyNotes && <p className="text-sm rounded-sm bg-vest-wash border border-vest/40 px-3 py-2 mb-3 whitespace-pre-line">{project.safetyNotes}</p>}
              <CheckInForm code={tag.code} kind="VOLUNTEER_CHECKIN" label="I'm here" placeholder="Optional: which group you're with" />
            </div>
          )}
          <details className="mt-3 card p-4">
            <summary className="font-semibold cursor-pointer">Report a problem at this site</summary>
            <div className="mt-3">
              <CheckInForm code={tag.code} kind="ISSUE_REPORT" label="Report to KHB" placeholder="Dumping is back, sharps found, no bags left…" />
            </div>
          </details>
          <Link href={`/projects/${project.id}`} className="block mt-4 text-sm text-green font-medium">Project page →</Link>
        </>
      ) : (
        <Notice tone="warn">This tag isn&apos;t linked to anything yet.</Notice>
      )}

      <p className="mt-8 text-xs text-ink-soft">Tapped {tag.taps + (done ? 0 : 1)} times.</p>
    </div>
  );
}
