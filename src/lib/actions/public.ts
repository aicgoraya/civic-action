"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, projects, signups, adoptionRequests, checkIns, tags, trees } from "@/db";
import { eq, sql } from "drizzle-orm";
import { notify, logActivity, onProjectSubmitted } from "@/lib/automations";
import { findNeighborhood } from "@/lib/queries";
import { HIGH_NEED_THRESHOLD, KHB_REVIEW_EMAIL, TREE_COMMITMENT_DAYS, appUrl } from "@/lib/constants";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

const str = (max = 2000) => z.string().trim().min(1, "Required").max(max);
const email = z.string().trim().email("Enter a valid email");
const optStr = z.string().trim().max(2000).optional().transform((v) => (v ? v : null));

function fieldsOf(fd: FormData) {
  const o: Record<string, string> = {};
  fd.forEach((v, k) => { if (typeof v === "string") o[k] = v; });
  return o;
}

function firstError(e: z.ZodError) {
  const i = e.issues[0];
  return `${String(i.path[0] ?? "")}: ${i.message}`.replace(/^: /, "");
}

// ---------- Pathways 1 & 3: submit / propose a project ----------

const projectSchema = z.object({
  kind: z.enum(["PARTNER", "COMMUNITY_GROUP"]),
  title: str(120),
  type: z.enum(["CLEANUP", "TREE_PLANTING", "BEAUTIFICATION", "ILLEGAL_DUMPING"]),
  description: str(4000).refine((s) => s.length >= 40, "Describe the site and the work in at least a sentence or two"),
  address: str(200),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  submitterName: str(100),
  submitterOrg: str(150),
  submitterEmail: email,
  submitterPhone: optStr,
  eventDate: z.string().optional(),
  volunteerEstimate: z.coerce.number().int().min(0).max(5000).optional(),
  siteOwnerNote: optStr,
  toolsNeeded: optStr,
  wasteHandling: optStr,
  safetyNotes: optStr,
  externalRefs: optStr,
  // tree projects: proposed steward
  stewardName: optStr,
  stewardEmail: optStr,
  treeCount: z.coerce.number().int().min(0).max(500).optional(),
});

export async function submitProject(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = projectSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error), fields: fieldsOf(fd) };
  const v = parsed.data;

  const hasCoords = Number.isFinite(v.lat) && Number.isFinite(v.lng) && v.lat !== 0;
  const nb = hasCoords ? await findNeighborhood(v.lat!, v.lng!) : null;
  const priority = !!nb && nb.needScore >= HIGH_NEED_THRESHOLD;

  if (v.type === "TREE_PLANTING" && (!v.stewardName || !v.stewardEmail)) {
    return { error: "Tree projects need a named steward who will water and monitor the trees for one year.", fields: fieldsOf(fd) };
  }

  const [p] = await db
    .insert(projects)
    .values({
      title: v.title,
      type: v.type,
      status: "SUBMITTED",
      description: v.description,
      address: v.address,
      lat: hasCoords ? v.lat : null,
      lng: hasCoords ? v.lng : null,
      neighborhoodId: nb?.id ?? null,
      siteOwnerNote: v.siteOwnerNote,
      submitterKind: v.kind,
      submitterName: v.submitterName,
      submitterOrg: v.submitterOrg,
      submitterEmail: v.submitterEmail,
      submitterPhone: v.submitterPhone,
      eventDate: v.eventDate ? new Date(v.eventDate) : null,
      volunteerEstimate: v.volunteerEstimate ?? null,
      toolsNeeded: v.toolsNeeded,
      wasteHandling: v.wasteHandling,
      safetyNotes: v.safetyNotes,
      externalRefs: v.externalRefs,
      priorityFlag: priority,
    })
    .returning();

  if (v.type === "TREE_PLANTING") {
    const n = Math.max(1, Math.min(v.treeCount ?? 1, 50));
    const created = await db
      .insert(trees)
      .values(
        Array.from({ length: n }, (_, i) => ({
          projectId: p.id,
          label: `Tree #${i + 1}`,
          stewardName: v.stewardName!,
          stewardEmail: v.stewardEmail!,
          wateringIntervalDays: 7,
        })),
      )
      .returning();
    // one stake tag per tree, ready to write onto an NFC sticker
    await db.insert(tags).values(
      created.map((t) => ({ code: `tree-${t.id.slice(0, 6)}`, label: `Stake tag — ${t.label}`, treeId: t.id, projectId: p.id })),
    );
    await notify(
      "STEWARD_WELCOME",
      v.stewardEmail!,
      `Please confirm: one year of tree care for "${p.title}"`,
      `Hi ${v.stewardName}, you've been named steward for ${n} tree(s). KHB can't publish the project until you accept the one-year watering & monitoring commitment: ${appUrl(`/projects/${p.id}/steward`)}`,
      p.id,
    );
  }

  await onProjectSubmitted(p);
  revalidatePath("/admin");
  redirect(`/projects/${p.id}?submitted=1`);
}

// ---------- Pathway 2: community group adopts an approved project ----------

const adoptSchema = z.object({
  projectId: str(64),
  orgName: str(150),
  contactName: str(100),
  contactEmail: email,
  contactPhone: optStr,
  groupSize: z.coerce.number().int().min(1).max(5000),
  message: optStr,
});

export async function adoptProject(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = adoptSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error), fields: fieldsOf(fd) };
  const v = parsed.data;
  const p = await db.query.projects.findFirst({ where: eq(projects.id, v.projectId) });
  if (!p || !["APPROVED", "PUBLISHED"].includes(p.status)) return { error: "This project isn't open for adoption." };
  if (p.adoptedByOrg) return { error: `This project is already led by ${p.adoptedByOrg}.` };

  await db.insert(adoptionRequests).values({ ...v, projectId: p.id });
  await logActivity(p.id, v.contactName, "ADOPTION_REQUESTED", `${v.orgName} (${v.groupSize} people)`);
  await notify("ADOPTION_RECEIVED", v.contactEmail, `We received your request to lead "${p.title}"`,
    `Hi ${v.contactName}, KHB will review ${v.orgName}'s request and confirm within a few days.`, p.id);
  await notify("REVIEWER_ALERT", KHB_REVIEW_EMAIL, `[Review] ${v.orgName} wants to lead "${p.title}"`,
    `${v.groupSize} people. ${v.message ?? ""}\n\nReview: ${appUrl(`/admin/projects/${p.id}`)}`, p.id);
  revalidatePath(`/projects/${p.id}`);
  redirect(`/projects/${p.id}?adopted=1`);
}

// ---------- Pathway 4: volunteer joins a published project ----------

const joinSchema = z.object({
  projectId: str(64),
  name: str(100),
  email,
  phone: optStr,
  waiver: z.literal("on", { message: "You need to accept the volunteer waiver" }),
});

export async function joinProject(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = joinSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error), fields: fieldsOf(fd) };
  const v = parsed.data;
  const p = await db.query.projects.findFirst({ where: eq(projects.id, v.projectId) });
  if (!p || p.status !== "PUBLISHED") return { error: "This project isn't open for sign-ups." };

  await db
    .insert(signups)
    .values({ projectId: p.id, name: v.name, email: v.email, phone: v.phone, waiverAccepted: true })
    .onConflictDoNothing();
  await notify("SIGNUP_CONFIRMATION", v.email, `You're signed up: ${p.title}`,
    `Hi ${v.name}, see you at ${p.address}. Tap the project sign with your phone when you arrive to check in.\n\n${p.safetyNotes ?? ""}`, p.id);
  revalidatePath(`/projects/${p.id}`);
  redirect(`/projects/${p.id}?joined=1`);
}

// ---------- NFC tag taps ----------

export async function recordTap(code: string) {
  await db.update(tags).set({ taps: sql`${tags.taps} + 1` }).where(eq(tags.code, code));
}

const checkInSchema = z.object({
  code: str(64),
  kind: z.enum(["VOLUNTEER_CHECKIN", "TREE_WATERING", "ISSUE_REPORT"]),
  name: str(100),
  note: optStr,
});

export async function tagCheckIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = checkInSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error), fields: fieldsOf(fd) };
  const v = parsed.data;
  const tag = await db.query.tags.findFirst({ where: eq(tags.code, v.code), with: { tree: true } });
  if (!tag) return { error: "Unknown tag." };

  await db.insert(checkIns).values({
    kind: v.kind,
    source: "NFC",
    projectId: tag.projectId ?? tag.tree?.projectId ?? null,
    treeId: tag.treeId ?? null,
    name: v.name,
    note: v.note,
  });

  const projectId = tag.projectId ?? tag.tree?.projectId;
  if (v.kind === "ISSUE_REPORT" && projectId) {
    await logActivity(projectId, v.name, "ISSUE_REPORTED", `${tag.tree ? tag.tree.label + ": " : ""}${v.note ?? "(no details)"}`);
    await notify("REVIEWER_ALERT", KHB_REVIEW_EMAIL, `[Issue] ${tag.tree?.label ?? tag.label ?? tag.code}`,
      `${v.name} reported: ${v.note ?? "(no details)"}\n\n${appUrl(`/admin/projects/${projectId}`)}`, projectId);
  }
  if (v.kind === "TREE_WATERING" && tag.tree && tag.tree.status === "STRUGGLING") {
    await db.update(trees).set({ status: "PLANTED" }).where(eq(trees.id, tag.tree.id));
  }
  revalidatePath(`/t/${v.code}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/impact");
  redirect(`/t/${v.code}?done=${v.kind}`);
}

// ---------- Steward accepts the one-year commitment ----------

export async function acceptStewardship(_prev: FormState, fd: FormData): Promise<FormState> {
  const projectId = String(fd.get("projectId") ?? "");
  const stewardEmail = String(fd.get("email") ?? "").trim().toLowerCase();
  const pledge = fd.get("pledge") === "on";
  if (!pledge) return { error: "Please accept the one-year commitment." };
  const ts = await db.select().from(trees).where(eq(trees.projectId, projectId));
  const mine = ts.filter((t) => t.stewardEmail.toLowerCase() === stewardEmail && !t.commitmentAcceptedAt);
  if (!mine.length) return { error: "No pending trees found for that email on this project." };
  const now = new Date();
  const ends = new Date(now.getTime() + TREE_COMMITMENT_DAYS * 86400000);
  for (const t of mine) {
    await db.update(trees).set({ commitmentAcceptedAt: now, commitmentEndsAt: ends }).where(eq(trees.id, t.id));
  }
  await logActivity(projectId, mine[0].stewardName, "STEWARD_ACCEPTED", `${mine.length} tree(s), through ${ends.toLocaleDateString("en-US")}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/projects/${projectId}?steward=1`);
}
