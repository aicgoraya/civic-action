import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { adminProject } from "@/lib/queries";
import { publicationChecks, treeHealth } from "@/lib/automations";
import { StatusChip, HighNeed, fmtDate, Dl, Notice } from "@/components/ui";
import { DetailsForm, RequestInfoForm, DeclineForm, CompleteForm, AddTreeForm, CreateTagForm } from "@/components/forms/AdminForms";
import { setVerified, setSiteConfirmed, approveProject, publishProject, unpublishProject, reopenProject, decideAdoption, setTreeStatus } from "@/lib/actions/admin";
import { PROJECT_TYPE_EMOJI, PROJECT_TYPE_LABEL, appUrl } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = await adminProject(id);
  if (!p) notFound();
  const checks = await publicationChecks(p);
  const allPass = checks.every((c) => c.ok);
  const reviewing = p.status === "SUBMITTED" || p.status === "NEEDS_INFO";

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6">
      <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">← Review queue</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">{PROJECT_TYPE_EMOJI[p.type]} {PROJECT_TYPE_LABEL[p.type]}</span>
            <StatusChip status={p.status} />
            {p.priorityFlag && <HighNeed />}
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold">{p.title}</h1>
          <p className="text-ink-soft">{p.address}{p.neighborhood ? ` · ${p.neighborhood.name} (need ${Math.round(p.neighborhood.needScore)})` : ""}</p>
        </div>
        <Link href={`/projects/${p.id}`} className="btn-secondary text-sm">View as public →</Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ----- Left: the record ----- */}
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-bold">Submission</h2>
            <p className="mt-2 text-sm whitespace-pre-line max-w-prose">{p.description}</p>
            <div className="mt-4">
              <Dl items={[
                ["Submitted by", <>{p.submitterName} · {p.submitterOrg} <span className="text-ink-soft">({p.submitterKind === "PARTNER" ? "partner" : "community group"})</span></>],
                ["Contact", <>{p.submitterEmail}{p.submitterPhone ? ` · ${p.submitterPhone}` : ""}</>],
                ["Submitted", fmtDate(p.createdAt)],
                ["Site note", p.siteOwnerNote ?? <span className="text-ink-soft">none given</span>],
              ]} />
            </div>
            {p.reviewerNote && <div className="mt-3"><Notice tone="warn"><strong>Last message to submitter:</strong> {p.reviewerNote}</Notice></div>}
          </section>

          <section className="card p-5">
            <h2 className="font-bold">Verification</h2>
            <p className="text-xs text-ink-soft mb-3">Both must be confirmed by a person before approval.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Toggle ok={p.submitterVerified} label="Submitter verified" detail="Called or emailed the organization; they're who they say they are and are allowed to request this."
                onAction={setVerified.bind(null, p.id, !p.submitterVerified)} />
              <Toggle ok={p.siteOwnershipConfirmed} label="Site permission confirmed" detail="Owner or agency has agreed to volunteers on the site on the proposed date."
                onAction={setSiteConfirmed.bind(null, p.id, !p.siteOwnershipConfirmed)} />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold">Logistics & details</h2>
            <p className="text-xs text-ink-soft mb-3">Add what the submitter didn&apos;t. These show on the public page once published.</p>
            <DetailsForm p={p} />
          </section>

          {p.type === "TREE_PLANTING" && (
            <section className="card p-5">
              <h2 className="font-bold">Trees & stewards</h2>
              <p className="text-xs text-ink-soft mb-3">Every tree needs a named steward who has accepted the 1-year commitment. Stewards accept at <code>{appUrl(`/projects/${p.id}/steward`)}</code>.</p>
              <ul className="divide-y divide-line border border-line rounded-sm mb-4 text-sm">
                {p.trees.length === 0 && <li className="px-3 py-2 text-ink-soft">No trees yet.</li>}
                {p.trees.map((t) => {
                  const h = treeHealth(t, t.checkIns[0]?.createdAt ?? null);
                  return (
                    <li key={t.id} className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">{t.label}</span>
                      <span className="text-ink-soft">{t.stewardName}</span>
                      <span className={`text-xs rounded-full px-1.5 ${t.commitmentAcceptedAt ? "bg-green-wash text-green-deep" : "bg-vest-wash text-[#9a3f0a]"}`}>{t.commitmentAcceptedAt ? "accepted" : "not accepted"}</span>
                      {t.commitmentAcceptedAt && <span className={`text-xs ${h.onTrack ? "text-green-deep" : "text-[#9a3f0a]"}`}>{t.checkIns[0] ? `watered ${h.daysSinceWater}d ago` : "never watered"}{h.overdueDays ? ` · ${h.overdueDays}d overdue` : ""}</span>}
                      <span className="ml-auto flex gap-1">
                        {["PLANTED", "STRUGGLING", "DEAD", "ESTABLISHED"].map((s) => (
                          <form key={s} action={setTreeStatus.bind(null, t.id, s)}>
                            <button className={`text-[11px] px-1.5 py-0.5 rounded-sm border ${t.status === s ? "bg-ink text-white border-ink" : "border-line text-ink-soft hover:border-ink/40"}`}>{s.toLowerCase()}</button>
                          </form>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <AddTreeForm projectId={p.id} />
            </section>
          )}

          <section className="card p-5">
            <h2 className="font-bold">Group-lead requests <span className="text-ink-soft font-normal">· {p.adoptions.length}</span></h2>
            {p.adoptedByOrg && <p className="text-sm mt-1">Currently led by <strong>{p.adoptedByOrg}</strong> ({p.adoptedByName}, {p.adoptedByEmail}).</p>}
            <ul className="mt-3 space-y-2">
              {p.adoptions.length === 0 && <li className="text-sm text-ink-soft">No requests yet.</li>}
              {p.adoptions.map((a) => (
                <li key={a.id} className="border border-line rounded-sm p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{a.orgName}</strong> <span className="text-ink-soft">· {a.groupSize} people · {a.contactName}, {a.contactEmail}</span>
                    <span className={`ml-auto text-xs rounded-full px-1.5 ${a.status === "APPROVED" ? "bg-green-wash text-green-deep" : a.status === "DECLINED" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900"}`}>{a.status.toLowerCase()}</span>
                  </div>
                  {a.message && <p className="mt-1 text-ink-soft">{a.message}</p>}
                  {a.status === "PENDING" && (
                    <div className="mt-2 flex gap-2">
                      <form action={decideAdoption.bind(null, a.id, true, undefined)}><button className="btn-primary text-sm py-1.5">Approve as lead</button></form>
                      <form action={decideAdoption.bind(null, a.id, false, "Another group has already been assigned to this project.")}><button className="btn-danger text-sm py-1.5">Decline</button></form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="font-bold">Volunteers <span className="text-ink-soft font-normal">· {p.signups.length}{p.volunteerEstimate ? ` of ${p.volunteerEstimate}` : ""}</span></h2>
            {p.signups.length > 0 && (
              <ul className="mt-2 text-sm columns-1 sm:columns-2">
                {p.signups.map((s) => <li key={s.id}>{s.name} <span className="text-ink-soft">· {s.email}</span></li>)}
              </ul>
            )}
            {p.checkIns.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold">Field activity (tag taps)</h3>
                <ul className="mt-1 text-sm divide-y divide-line">
                  {p.checkIns.map((c) => (
                    <li key={c.id} className="py-1.5 flex gap-3"><span className="text-ink-soft w-28 shrink-0">{fmtDate(c.createdAt, { weekday: undefined })}</span><span>{c.name} — {c.kind.toLowerCase().replace("_", " ")}{c.note ? `: ${c.note}` : ""}</span></li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-bold">Physical tags</h2>
            <p className="text-xs text-ink-soft mb-3">Each NFC sticker is written with one of these URLs. Tap count shows real field use.</p>
            <ul className="text-sm divide-y divide-line border border-line rounded-sm mb-4">
              {p.tags.length === 0 && <li className="px-3 py-2 text-ink-soft">No tags yet.</li>}
              {p.tags.map((t) => (
                <li key={t.id} className="px-3 py-2 flex flex-wrap items-center gap-x-3">
                  <code className="font-mono text-xs bg-ground px-1.5 py-0.5 rounded-sm">{appUrl(`/t/${t.code}`)}</code>
                  <span className="text-ink-soft">{t.label}</span>
                  <span className="ml-auto text-xs text-ink-soft">{t.taps} taps</span>
                </li>
              ))}
            </ul>
            <CreateTagForm projectId={p.id} />
          </section>

          <section className="card p-5">
            <h2 className="font-bold">History</h2>
            <ul className="mt-2 text-sm divide-y divide-line">
              {p.activity.map((a) => (
                <li key={a.id} className="py-1.5 grid grid-cols-[8rem_1fr] gap-3">
                  <span className="text-ink-soft">{fmtDate(a.createdAt, { weekday: undefined })}</span>
                  <span><strong>{a.actor}</strong> · {a.action.toLowerCase().replace(/_/g, " ")}{a.detail ? ` — ${a.detail}` : ""}</span>
                </li>
              ))}
            </ul>
            {p.notifications.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold">Messages sent for this project</h3>
                <ul className="mt-1 text-sm divide-y divide-line">
                  {p.notifications.map((n) => (
                    <li key={n.id} className="py-1.5 grid grid-cols-[8rem_1fr] gap-3">
                      <span className="text-ink-soft">{fmtDate(n.createdAt, { weekday: undefined })}</span>
                      <span><span className="text-ink-soft">to {n.to}:</span> {n.subject}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        {/* ----- Right: decisions ----- */}
        <aside className="space-y-4 lg:sticky lg:top-[7.5rem] self-start">
          <section className="card p-4 border-ink/30">
            <h2 className="font-bold">Decision</h2>

            {reviewing && (
              <div className="mt-3 space-y-4">
                <form action={approveProject.bind(null, p.id)}>
                  <button className="btn-primary w-full" disabled={!p.submitterVerified} title={!p.submitterVerified ? "Verify the submitter first" : ""}>Approve</button>
                  {!p.submitterVerified && <p className="hint">Verify the submitter before approving.</p>}
                </form>
                <RequestInfoForm id={p.id} current={p.status === "NEEDS_INFO" ? p.reviewerNote : ""} />
                <DeclineForm id={p.id} />
              </div>
            )}

            {p.status === "APPROVED" && (
              <div className="mt-3 space-y-4">
                <div>
                  <div className="text-sm font-semibold mb-1">Publication checks</div>
                  <ul className="text-sm space-y-1">
                    {checks.map((c) => (
                      <li key={c.key} className="flex gap-2">
                        <span className={c.ok ? "text-green-deep" : "text-[#9a3f0a]"} aria-hidden>{c.ok ? "✓" : "✗"}</span>
                        <span className={c.ok ? "" : "text-ink"}>{c.label}{!c.ok && c.hint ? <span className="text-ink-soft"> — {c.hint}</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <form action={publishProject.bind(null, p.id)}>
                  <button className="btn-primary w-full" disabled={!allPass}>Publish to directory</button>
                  {!allPass && <p className="hint">Fix the items above (in “Logistics & details”) to enable publishing.</p>}
                </form>
                <form action={reopenProject.bind(null, p.id)}><button className="btn-ghost w-full text-sm">Send back to review</button></form>
                <DeclineForm id={p.id} />
              </div>
            )}

            {p.status === "PUBLISHED" && (
              <div className="mt-3 space-y-4">
                <Notice tone="success">Live since {fmtDate(p.publishedAt)}. {p.signups.length} signed up.</Notice>
                <form action={unpublishProject.bind(null, p.id)}><button className="btn-secondary w-full">Unpublish (back to approved)</button></form>
                <div className="border-t border-line pt-4">
                  <div className="text-sm font-semibold mb-2">After the event</div>
                  <CompleteForm p={p} />
                </div>
              </div>
            )}

            {p.status === "COMPLETED" && (
              <div className="mt-3 space-y-3">
                <Dl items={[["Volunteers", p.resultVolunteers ?? "—"], ["Hours", p.resultHours ?? "—"], ["Waste", p.resultWasteLbs ? `${p.resultWasteLbs} lb` : "—"], ["Trees", p.resultTreesPlanted ?? "—"]]} />
                <CompleteForm p={p} />
              </div>
            )}

            {p.status === "DECLINED" && (
              <div className="mt-3 space-y-3">
                <Notice tone="warn">Declined. The submitter was told: “{p.reviewerNote}”</Notice>
                <form action={reopenProject.bind(null, p.id)}><button className="btn-secondary w-full">Reopen for review</button></form>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Toggle({ ok, label, detail, onAction }: { ok: boolean; label: string; detail: string; onAction: () => Promise<void> }) {
  return (
    <form action={onAction} className={`rounded-sm border p-3 ${ok ? "border-green/40 bg-green-wash" : "border-line"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">{ok ? "✓ " : ""}{label}</span>
        <button className={`text-xs px-2 py-1 rounded-sm border ${ok ? "border-green/40 text-green-deep bg-paper" : "bg-ink text-white border-ink"}`}>{ok ? "Undo" : "Confirm"}</button>
      </div>
      <p className="text-xs text-ink-soft mt-1">{detail}</p>
    </form>
  );
}
