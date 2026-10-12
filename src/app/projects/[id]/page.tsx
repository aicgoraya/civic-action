import Link from "next/link";
import { notFound } from "next/navigation";
import { publicProject, allNeighborhoods } from "@/lib/queries";
import { StatusChip, HighNeed, fmtDate, Notice, Dl } from "@/components/ui";
import { ProjectMap } from "@/components/MapClient";
import { PROJECT_TYPE_EMOJI, PROJECT_TYPE_LABEL } from "@/lib/constants";
import { treeHealth } from "@/lib/automations";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const p = await publicProject(id);
  if (!p) notFound();
  const isPublic = p.status === "PUBLISHED" || p.status === "COMPLETED";
  const nbs = isPublic ? await allNeighborhoods() : [];
  const spotsLeft = p.volunteerEstimate ? Math.max(0, p.volunteerEstimate - p.signups.length) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6">
      <Link href="/projects" className="text-sm text-ink-soft hover:text-ink">← All projects</Link>

      {sp.submitted && (
        <div className="mt-4"><Notice tone="success">
          <strong>Received.</strong> KHB will verify your organization and the site before anything is published. We sent a confirmation to {p.submitterEmail}.
        </Notice></div>
      )}
      {sp.joined && <div className="mt-4"><Notice tone="success"><strong>You&apos;re signed up.</strong> On the day, tap the project sign with your phone to check in.</Notice></div>}
      {sp.adopted && <div className="mt-4"><Notice tone="success"><strong>Request sent.</strong> KHB will confirm your group as project lead.</Notice></div>}
      {sp.steward && <div className="mt-4"><Notice tone="success"><strong>Thank you.</strong> Your one-year stewardship commitment is recorded.</Notice></div>}

      {!isPublic && (
        <div className="mt-4">
          <Notice tone="warn">
            This project is <strong>not public</strong> yet — it&apos;s {p.status === "DECLINED" ? "been declined" : "waiting on Keep Houston Beautiful review"}. Only the submitter can see this page from the link in their email.
            {p.reviewerNote && <p className="mt-2 whitespace-pre-line"><strong>From KHB:</strong> {p.reviewerNote}</p>}
          </Notice>
        </div>
      )}

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">{PROJECT_TYPE_EMOJI[p.type]} {PROJECT_TYPE_LABEL[p.type]}</span>
            <StatusChip status={p.status} />
            {p.priorityFlag && <HighNeed />}
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold">{p.title}</h1>
          <p className="mt-1 text-ink-soft">{p.address}{p.neighborhood ? ` · ${p.neighborhood.name}` : ""}</p>
          <p className="mt-4 whitespace-pre-line max-w-prose leading-relaxed">{p.description}</p>

          <div className="mt-6 card p-4">
            <Dl items={[
              ["When", <>{fmtDate(p.eventDate)}{p.durationHours ? ` · ${p.durationHours} h` : ""}</>],
              ["Organized by", <>{p.submitterOrg}{p.adoptedByOrg ? <> · led by <strong>{p.adoptedByOrg}</strong></> : null}</>],
              ["Volunteers", p.volunteerEstimate ? `${p.signups.length} signed up of ${p.volunteerEstimate} needed` : `${p.signups.length} signed up`],
              ["Tools", p.toolsNeeded ?? "Provided on site"],
              ["Waste", p.wasteHandling ?? "—"],
              ["Safety", p.safetyNotes ? <span className="whitespace-pre-line">{p.safetyNotes}</span> : "—"],
            ]} />
          </div>

          {p.type === "TREE_PLANTING" && p.trees.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">Tree stewardship</h2>
              <p className="text-sm text-ink-soft mt-1 max-w-prose">Every tree has a named neighbor who committed to a year of watering. Stewards tap the tag on the stake each time they water.</p>
              <ul className="mt-3 divide-y divide-line card">
                {p.trees.map((t) => {
                  const h = treeHealth(t, t.checkIns[0]?.createdAt ?? null);
                  return (
                    <li key={t.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${t.status === "DEAD" ? "bg-ink/30" : h.onTrack ? "bg-green" : "bg-vest"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{t.label}{t.species ? <span className="text-ink-soft font-normal"> · {t.species}</span> : null}</div>
                        <div className="text-ink-soft text-xs">
                          Steward {t.stewardName}
                          {t.commitmentAcceptedAt ? ` · ${h.remainingDays} days left on commitment` : " · commitment not yet accepted"}
                          {" · "}{t.checkIns[0] ? `watered ${h.daysSinceWater === 0 ? "today" : h.daysSinceWater + " days ago"}` : "no watering logged"}
                        </div>
                      </div>
                      <Link href={`/trees/${t.id}`} className="text-green text-xs font-medium shrink-0">Log</Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {p.checkIns.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">Recent activity on site</h2>
              <ul className="mt-2 text-sm divide-y divide-line card">
                {p.checkIns.map((c) => (
                  <li key={c.id} className="px-4 py-2.5 flex gap-3">
                    <span className="text-ink-soft shrink-0 w-28">{fmtDate(c.createdAt, { weekday: undefined })}</span>
                    <span className="min-w-0">
                      <strong>{c.name}</strong>{" "}
                      {c.kind === "VOLUNTEER_CHECKIN" ? "checked in" : c.kind === "TREE_WATERING" ? "logged watering" : "reported an issue"}
                      {c.source === "NFC" ? " (tapped tag)" : ""}{c.note ? ` — ${c.note}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          {p.status === "PUBLISHED" && (
            <div className="card p-4">
              <div className="text-sm text-ink-soft">{spotsLeft == null ? "Open sign-up" : spotsLeft > 0 ? `${spotsLeft} spots left` : "Full — join the waitlist"}</div>
              <Link href={`/projects/${p.id}/join`} className="btn-primary w-full mt-2">Join as a volunteer</Link>
              {!p.adoptedByOrg && (
                <Link href={`/projects/${p.id}/adopt`} className="btn-secondary w-full mt-2">Lead this project as a group</Link>
              )}
            </div>
          )}
          {p.status === "COMPLETED" && (
            <div className="card p-4">
              <div className="font-semibold">Results</div>
              <Dl items={[
                ["Volunteers", p.resultVolunteers ?? "—"],
                ["Hours", p.resultHours ?? "—"],
                ["Waste removed", p.resultWasteLbs ? `${p.resultWasteLbs.toLocaleString()} lb` : "—"],
                ["Trees planted", p.resultTreesPlanted ?? "—"],
              ]} />
            </div>
          )}
          {p.type === "TREE_PLANTING" && p.trees.some((t) => !t.commitmentAcceptedAt) && (
            <div className="card p-4 border-vest/50">
              <div className="font-semibold">Stewards: confirm your commitment</div>
              <p className="text-sm text-ink-soft mt-1">KHB can&apos;t publish a tree project until every named steward accepts one year of watering and monitoring.</p>
              <Link href={`/projects/${p.id}/steward`} className="btn-vest w-full mt-3">Accept stewardship</Link>
            </div>
          )}
          {isPublic && p.lat != null && p.lng != null && (
            <ProjectMap markers={[{ id: p.id, title: p.title, lat: p.lat, lng: p.lng, type: p.type, status: p.status, priority: p.priorityFlag, href: `/projects/${p.id}` }]}
              neighborhoods={nbs} height={260} center={[p.lat, p.lng]} zoom={13} showNeedDefault={false} />
          )}
          {p.externalRefs && (
            <div className="card p-4 text-sm">
              <div className="font-semibold">Linked records</div>
              <p className="text-ink-soft mt-1 whitespace-pre-line">{p.externalRefs}</p>
              <p className="hint">311, Volunteer Houston, ToolBank and Texas Litter Database integrations are mocked in this prototype.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
