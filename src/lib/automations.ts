// Practical automations required by the problem statement:
// submission acknowledgments, reviewer alerts, requests for missing
// information, publication checks, event reminders, tree-maintenance
// checkpoints. NONE of these approve or publish a project — only a
// KHB reviewer can do that (see src/lib/review.ts).

import { db, notifications, activity, projects, trees, checkIns, signups } from "@/db";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { KHB_REVIEW_EMAIL, appUrl } from "./constants";
import type { Notification, Project, Tree } from "@/db/schema";

type Kind = Notification["kind"];

export async function notify(
  kind: Kind,
  to: string,
  subject: string,
  body: string,
  projectId?: string | null,
) {
  await db.insert(notifications).values({ kind, to, subject, body, projectId: projectId ?? null });
}

export async function logActivity(
  projectId: string,
  actor: string,
  action: string,
  detail?: string,
) {
  await db.insert(activity).values({ projectId, actor, action, detail });
}

// ---- Submission ----
export async function onProjectSubmitted(p: Project) {
  await logActivity(p.id, p.submitterName, "SUBMITTED", `${p.submitterOrg} submitted "${p.title}"`);
  await notify(
    "SUBMISSION_ACK",
    p.submitterEmail,
    `We received your project: ${p.title}`,
    `Hi ${p.submitterName},\n\nKeep Houston Beautiful received "${p.title}" at ${p.address}. ` +
      `A reviewer will verify the site and your organization before anything is published. ` +
      `You'll hear from us if we need more information.\n\nTrack status: ${appUrl(`/projects/${p.id}`)}`,
    p.id,
  );
  await notify(
    "REVIEWER_ALERT",
    KHB_REVIEW_EMAIL,
    `[Review] New ${p.submitterKind === "PARTNER" ? "partner" : "community"} project: ${p.title}`,
    `${p.submitterOrg} (${p.submitterEmail}) submitted "${p.title}" at ${p.address}.` +
      (p.priorityFlag ? `\n\n⚠ Located in a HIGH-NEED area — prioritize.` : "") +
      `\n\nReview: ${appUrl(`/admin/projects/${p.id}`)}`,
    p.id,
  );
}

// ---- Publication checks ----
// A project may only be published when every item passes. This runs on the
// server inside the publish action, so it can't be bypassed from the UI.
export type PubCheck = { key: string; label: string; ok: boolean; hint?: string };

export async function publicationChecks(p: Project): Promise<PubCheck[]> {
  const checks: PubCheck[] = [
    { key: "verified", label: "Submitter verified by KHB", ok: p.submitterVerified },
    { key: "site", label: "Site ownership / permission confirmed", ok: p.siteOwnershipConfirmed },
    { key: "date", label: "Event date set", ok: !!p.eventDate },
    { key: "volunteers", label: "Volunteer estimate set", ok: (p.volunteerEstimate ?? 0) > 0 },
    { key: "safety", label: "Safety notes provided", ok: !!p.safetyNotes?.trim() },
    { key: "waste", label: "Waste handling arranged", ok: !!p.wasteHandling?.trim() },
    { key: "coords", label: "Map location set", ok: p.lat != null && p.lng != null },
  ];
  if (p.type === "TREE_PLANTING") {
    const ts = await db.select().from(trees).where(eq(trees.projectId, p.id));
    const accepted = ts.filter((t) => t.commitmentAcceptedAt);
    checks.push({
      key: "steward",
      label: "Named steward accepted 1-year watering commitment",
      ok: ts.length > 0 && accepted.length === ts.length,
      hint: ts.length === 0 ? "Add at least one tree with a steward" : `${accepted.length}/${ts.length} stewards accepted`,
    });
  }
  return checks;
}

// ---- Scheduled automations (run by /api/cron, or manually from admin) ----

export async function runEventReminders(now = new Date()) {
  const soon = new Date(now.getTime() + 48 * 3600 * 1000);
  const upcoming = await db
    .select()
    .from(projects)
    .where(and(eq(projects.status, "PUBLISHED"), gte(projects.eventDate, now), lte(projects.eventDate, soon)));
  let sent = 0;
  for (const p of upcoming) {
    // skip if we already reminded for this project
    const already = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.projectId, p.id), eq(notifications.kind, "EVENT_REMINDER")))
      .limit(1);
    if (already.length) continue;
    const vols = await db.select().from(signups).where(eq(signups.projectId, p.id));
    for (const v of vols) {
      await notify(
        "EVENT_REMINDER",
        v.email,
        `Reminder: ${p.title} is ${p.eventDate!.toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })}`,
        `Hi ${v.name}, see you at ${p.address}. Bring water, closed-toe shoes and gloves. ` +
          `Tap the project sign with your phone when you arrive to check in.\n\n${p.safetyNotes ?? ""}`,
        p.id,
      );
      sent++;
    }
    await logActivity(p.id, "system", "EVENT_REMINDERS_SENT", `${vols.length} volunteers reminded`);
  }
  return sent;
}

export async function runTreeCheckpoints(now = new Date()) {
  const all = await db.select().from(trees);
  let sent = 0;
  for (const t of all) {
    if (!t.commitmentAcceptedAt || t.status === "DEAD" || t.status === "ESTABLISHED") continue;
    const last = await lastWatering(t.id);
    const base = last ?? t.plantedAt ?? t.commitmentAcceptedAt;
    const overdueDays = (now.getTime() - base.getTime()) / 86400000 - t.wateringIntervalDays;
    if (overdueDays <= 0) continue;
    // one checkpoint notice per tree per interval
    const recent = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.kind, "TREE_CHECKPOINT"),
          eq(notifications.to, t.stewardEmail),
          gte(notifications.createdAt, new Date(now.getTime() - t.wateringIntervalDays * 86400000)),
        ),
      )
      .limit(1);
    if (recent.length) continue;
    await notify(
      "TREE_CHECKPOINT",
      t.stewardEmail,
      `Watering check: ${t.label} is ${Math.round(overdueDays)} day(s) overdue`,
      `Hi ${t.stewardName}, we haven't seen a watering log for "${t.label}" in ${Math.round(overdueDays + t.wateringIntervalDays)} days. ` +
        `Please water it and tap the tag on the stake (or log it here: ${appUrl(`/trees/${t.id}`)}). ` +
        `If the tree looks unhealthy, tap "Report an issue" and KHB will follow up.`,
      t.projectId,
    );
    sent++;
  }
  return sent;
}

export async function lastWatering(treeId: string): Promise<Date | null> {
  const r = await db
    .select({ at: checkIns.createdAt })
    .from(checkIns)
    .where(and(eq(checkIns.treeId, treeId), eq(checkIns.kind, "TREE_WATERING")))
    .orderBy(desc(checkIns.createdAt))
    .limit(1);
  return r[0]?.at ?? null;
}

export function treeHealth(t: Tree, last: Date | null, now = new Date()) {
  const base = last ?? t.plantedAt ?? t.commitmentAcceptedAt ?? t.createdAt;
  const days = (now.getTime() - base.getTime()) / 86400000;
  const overdue = days - t.wateringIntervalDays;
  const remainingDays = t.commitmentEndsAt
    ? Math.max(0, Math.ceil((t.commitmentEndsAt.getTime() - now.getTime()) / 86400000))
    : null;
  return {
    daysSinceWater: Math.floor(days),
    overdueDays: overdue > 0 ? Math.ceil(overdue) : 0,
    onTrack: overdue <= 0,
    remainingDays,
  };
}
