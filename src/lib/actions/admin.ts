"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, projects, adoptionRequests, trees, tags, notifications } from "@/db";
import { eq, desc } from "drizzle-orm";
import { isAdmin, login, logout } from "@/lib/auth";
import { notify, logActivity, publicationChecks, runEventReminders, runTreeCheckpoints } from "@/lib/automations";
import { findNeighborhood } from "@/lib/queries";
import { HIGH_NEED_THRESHOLD, appUrl } from "@/lib/constants";
import type { FormState } from "./public";

const ACTOR = "KHB staff";

async function guard() {
  if (!(await isAdmin())) redirect("/admin/login");
}

function bump(id: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/projects/${id}`);
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/impact");
}

export async function adminLogin(_prev: FormState, fd: FormData): Promise<FormState> {
  const ok = await login(String(fd.get("password") ?? ""));
  if (!ok) return { error: "Wrong password." };
  redirect("/admin");
}

export async function adminLogout() {
  await logout();
  redirect("/");
}

// ---- Verify submitter ----
export async function setVerified(id: string, verified: boolean) {
  await guard();
  await db.update(projects).set({ submitterVerified: verified, updatedAt: new Date() }).where(eq(projects.id, id));
  await logActivity(id, ACTOR, verified ? "SUBMITTER_VERIFIED" : "SUBMITTER_UNVERIFIED");
  bump(id);
}

export async function setSiteConfirmed(id: string, ok: boolean) {
  await guard();
  await db.update(projects).set({ siteOwnershipConfirmed: ok, updatedAt: new Date() }).where(eq(projects.id, id));
  await logActivity(id, ACTOR, ok ? "SITE_CONFIRMED" : "SITE_UNCONFIRMED");
  bump(id);
}

// ---- Add / edit details ----
const detailsSchema = z.object({
  id: z.string(),
  eventDate: z.string().optional(),
  durationHours: z.coerce.number().min(0).max(24).optional(),
  volunteerEstimate: z.coerce.number().int().min(0).max(5000).optional(),
  toolsNeeded: z.string().max(2000).optional(),
  wasteHandling: z.string().max(2000).optional(),
  safetyNotes: z.string().max(2000).optional(),
  externalRefs: z.string().max(2000).optional(),
  siteOwnerNote: z.string().max(2000).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  priorityFlag: z.string().optional(),
});

export async function saveDetails(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const parsed = detailsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const hasCoords = Number.isFinite(v.lat) && Number.isFinite(v.lng) && v.lat !== 0;
  const nb = hasCoords ? await findNeighborhood(v.lat!, v.lng!) : null;
  const nul = (s?: string) => (s && s.trim() ? s.trim() : null);
  await db
    .update(projects)
    .set({
      eventDate: v.eventDate ? new Date(v.eventDate) : null,
      durationHours: v.durationHours ?? null,
      volunteerEstimate: v.volunteerEstimate ?? null,
      toolsNeeded: nul(v.toolsNeeded),
      wasteHandling: nul(v.wasteHandling),
      safetyNotes: nul(v.safetyNotes),
      externalRefs: nul(v.externalRefs),
      siteOwnerNote: nul(v.siteOwnerNote),
      ...(hasCoords ? { lat: v.lat, lng: v.lng, neighborhoodId: nb?.id ?? null } : {}),
      priorityFlag: v.priorityFlag === "on" || (!!nb && nb.needScore >= HIGH_NEED_THRESHOLD && v.priorityFlag !== "off"),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, v.id));
  await logActivity(v.id, ACTOR, "DETAILS_UPDATED");
  bump(v.id);
  return undefined;
}

// ---- Request edits ----
export async function requestInfo(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const id = String(fd.get("id"));
  const note = String(fd.get("note") ?? "").trim();
  if (note.length < 10) return { error: "Tell the submitter exactly what's missing." };
  const p = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  if (!p) return { error: "Not found" };
  await db.update(projects).set({ status: "NEEDS_INFO", reviewerNote: note, updatedAt: new Date() }).where(eq(projects.id, id));
  await logActivity(id, ACTOR, "INFO_REQUESTED", note);
  await notify("INFO_REQUEST", p.submitterEmail, `KHB needs more information: ${p.title}`,
    `Hi ${p.submitterName},\n\n${note}\n\nReply to this message or update your project: ${appUrl(`/projects/${p.id}`)}`, id);
  bump(id);
  return undefined;
}

// ---- Approve / decline ----
export async function approveProject(id: string) {
  await guard();
  const p = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  if (!p) return;
  if (!p.submitterVerified) throw new Error("Verify the submitter before approving.");
  await db.update(projects).set({ status: "APPROVED", reviewerNote: null, updatedAt: new Date() }).where(eq(projects.id, id));
  await logActivity(id, ACTOR, "APPROVED");
  await notify("APPROVED", p.submitterEmail, `Approved: ${p.title}`,
    `Hi ${p.submitterName}, KHB approved "${p.title}". We'll publish it to the public directory once logistics are confirmed.`, id);
  bump(id);
}

export async function declineProject(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const id = String(fd.get("id"));
  const note = String(fd.get("note") ?? "").trim();
  if (note.length < 10) return { error: "Give the submitter a reason." };
  const p = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  if (!p) return { error: "Not found" };
  await db.update(projects).set({ status: "DECLINED", reviewerNote: note, publishedAt: null, updatedAt: new Date() }).where(eq(projects.id, id));
  await logActivity(id, ACTOR, "DECLINED", note);
  await notify("DECLINED", p.submitterEmail, `Update on ${p.title}`, `Hi ${p.submitterName},\n\n${note}`, id);
  bump(id);
  return undefined;
}

// ---- Publish / unpublish (publication checks enforced here) ----
export async function publishProject(id: string) {
  await guard();
  const p = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  if (!p) return;
  if (p.status !== "APPROVED") throw new Error("Only approved projects can be published.");
  const checks = await publicationChecks(p);
  const failing = checks.filter((c) => !c.ok);
  if (failing.length) throw new Error(`Publication blocked: ${failing.map((c) => c.label).join("; ")}`);
  await db.update(projects).set({ status: "PUBLISHED", publishedAt: new Date(), updatedAt: new Date() }).where(eq(projects.id, id));
  await logActivity(id, ACTOR, "PUBLISHED", "All publication checks passed");
  await notify("PUBLISHED", p.submitterEmail, `Now live: ${p.title}`,
    `Hi ${p.submitterName}, "${p.title}" is live. Volunteers can sign up here: ${appUrl(`/projects/${p.id}`)}`, id);
  bump(id);
}

export async function unpublishProject(id: string) {
  await guard();
  await db.update(projects).set({ status: "APPROVED", publishedAt: null, updatedAt: new Date() }).where(eq(projects.id, id));
  await logActivity(id, ACTOR, "UNPUBLISHED");
  bump(id);
}

export async function reopenProject(id: string) {
  await guard();
  await db.update(projects).set({ status: "SUBMITTED", updatedAt: new Date() }).where(eq(projects.id, id));
  await logActivity(id, ACTOR, "REOPENED");
  bump(id);
}

// ---- Complete with results ----
export async function completeProject(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const id = String(fd.get("id"));
  const n = (k: string) => { const v = Number(fd.get(k)); return Number.isFinite(v) && v > 0 ? v : null; };
  await db.update(projects).set({
    status: "COMPLETED",
    resultVolunteers: n("resultVolunteers"),
    resultHours: n("resultHours"),
    resultWasteLbs: n("resultWasteLbs"),
    resultTreesPlanted: n("resultTreesPlanted"),
    updatedAt: new Date(),
  }).where(eq(projects.id, id));
  await logActivity(id, ACTOR, "COMPLETED", `${n("resultVolunteers") ?? 0} volunteers · ${n("resultWasteLbs") ?? 0} lb · ${n("resultTreesPlanted") ?? 0} trees`);
  bump(id);
  return undefined;
}

// ---- Adoption decisions ----
export async function decideAdoption(adoptionId: string, approve: boolean, note?: string) {
  await guard();
  const a = await db.query.adoptionRequests.findFirst({ where: eq(adoptionRequests.id, adoptionId), with: { project: true } });
  if (!a) return;
  await db.update(adoptionRequests).set({ status: approve ? "APPROVED" : "DECLINED", decisionNote: note ?? null }).where(eq(adoptionRequests.id, adoptionId));
  if (approve) {
    await db.update(projects).set({ adoptedByOrg: a.orgName, adoptedByName: a.contactName, adoptedByEmail: a.contactEmail, updatedAt: new Date() }).where(eq(projects.id, a.projectId));
  }
  await logActivity(a.projectId, ACTOR, approve ? "ADOPTION_APPROVED" : "ADOPTION_DECLINED", a.orgName);
  await notify("ADOPTION_DECISION", a.contactEmail,
    approve ? `You're leading "${a.project.title}"` : `Update on your request to lead "${a.project.title}"`,
    approve ? `Hi ${a.contactName}, KHB approved ${a.orgName} as project lead. We'll send logistics details shortly.` : `Hi ${a.contactName}, ${note ?? "KHB wasn't able to approve this request."}`,
    a.projectId);
  bump(a.projectId);
}

// ---- Trees ----
export async function addTree(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const projectId = String(fd.get("projectId"));
  const label = String(fd.get("label") ?? "").trim();
  const stewardName = String(fd.get("stewardName") ?? "").trim();
  const stewardEmail = String(fd.get("stewardEmail") ?? "").trim();
  const species = String(fd.get("species") ?? "").trim() || null;
  if (!label || !stewardName || !stewardEmail) return { error: "Label, steward name and email are required." };
  const [t] = await db.insert(trees).values({ projectId, label, species, stewardName, stewardEmail }).returning();
  await db.insert(tags).values({ code: `tree-${t.id.slice(0, 6)}`, label: `Stake tag — ${label}`, treeId: t.id, projectId });
  await notify("STEWARD_WELCOME", stewardEmail, `Please confirm: one year of tree care for "${label}"`,
    `Hi ${stewardName}, please accept the one-year watering & monitoring commitment: ${appUrl(`/projects/${projectId}/steward`)}`, projectId);
  await logActivity(projectId, ACTOR, "TREE_ADDED", `${label} · steward ${stewardName}`);
  bump(projectId);
  return undefined;
}

export async function setTreeStatus(treeId: string, status: string) {
  await guard();
  const t = await db.query.trees.findFirst({ where: eq(trees.id, treeId) });
  if (!t) return;
  await db.update(trees).set({ status }).where(eq(trees.id, treeId));
  await logActivity(t.projectId, ACTOR, "TREE_STATUS", `${t.label} → ${status}`);
  bump(t.projectId);
  revalidatePath("/admin/stewardship");
}

// ---- Tags ----
export async function createTag(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const projectId = String(fd.get("projectId"));
  const label = String(fd.get("label") ?? "").trim() || null;
  const code = (String(fd.get("code") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || `khb-${Math.random().toString(36).slice(2, 6)}`);
  try {
    await db.insert(tags).values({ code, label, projectId });
  } catch {
    return { error: `Code "${code}" is already in use.` };
  }
  await logActivity(projectId, ACTOR, "TAG_CREATED", code);
  bump(projectId);
  revalidatePath("/admin/tags");
  return undefined;
}

// ---- Run scheduled automations now ----
export async function runAutomationsNow() {
  await guard();
  const reminders = await runEventReminders();
  const checkpoints = await runTreeCheckpoints();
  revalidatePath("/admin/outbox");
  revalidatePath("/admin/stewardship");
  redirect(`/admin/outbox?ran=1&reminders=${reminders}&checkpoints=${checkpoints}`);
}

export async function latestNotification() {
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(1);
}
