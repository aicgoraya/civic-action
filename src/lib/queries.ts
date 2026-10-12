import { db, projects, signups, neighborhoods, trees, checkIns, tags, adoptionRequests, activity, notifications } from "@/db";
import { and, eq, desc, asc, inArray, sql, count, gte } from "drizzle-orm";

export const PUBLIC_STATUSES = ["PUBLISHED", "COMPLETED"] as const;

export async function publicProjects() {
  const rows = await db.query.projects.findMany({
    where: inArray(projects.status, [...PUBLIC_STATUSES]),
    with: { neighborhood: true, signups: { columns: { id: true } } },
    orderBy: [asc(projects.status), asc(projects.eventDate)],
  });
  return rows;
}

export async function upcomingProjects(limit = 4) {
  return db.query.projects.findMany({
    where: and(eq(projects.status, "PUBLISHED"), gte(projects.eventDate, new Date())),
    with: { neighborhood: true, signups: { columns: { id: true } } },
    orderBy: [asc(projects.eventDate)],
    limit,
  });
}

export async function publicProject(id: string) {
  const p = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      neighborhood: true,
      signups: { columns: { id: true, name: true } },
      trees: { with: { checkIns: { orderBy: desc(checkIns.createdAt), limit: 1 } } },
      checkIns: { orderBy: desc(checkIns.createdAt), limit: 10 },
      activity: { orderBy: desc(activity.createdAt) },
    },
  });
  return p ?? null;
}

export async function allNeighborhoods() {
  return db.select().from(neighborhoods).orderBy(desc(neighborhoods.needScore));
}

export async function findNeighborhood(lat: number, lng: number) {
  // nearest neighborhood centroid (good enough for a prototype)
  const all = await db.select().from(neighborhoods);
  let best = all[0];
  let bestD = Infinity;
  for (const n of all) {
    const d = (n.lat - lat) ** 2 + (n.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = n; }
  }
  return best ?? null;
}

export async function tagByCode(code: string) {
  return db.query.tags.findFirst({
    where: eq(tags.code, code),
    with: { project: { with: { neighborhood: true } }, tree: { with: { project: true } } },
  });
}

export async function treeById(id: string) {
  return db.query.trees.findFirst({
    where: eq(trees.id, id),
    with: { project: true, checkIns: { orderBy: desc(checkIns.createdAt), limit: 30 }, tags: true },
  });
}

export async function impactStats() {
  const [totals] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${projects.status} = 'COMPLETED')`.mapWith(Number),
      live: sql<number>`count(*) filter (where ${projects.status} = 'PUBLISHED')`.mapWith(Number),
      inReview: sql<number>`count(*) filter (where ${projects.status} in ('SUBMITTED','NEEDS_INFO'))`.mapWith(Number),
      volunteers: sql<number>`coalesce(sum(${projects.resultVolunteers}),0)`.mapWith(Number),
      hours: sql<number>`coalesce(sum(${projects.resultHours}),0)`.mapWith(Number),
      wasteLbs: sql<number>`coalesce(sum(${projects.resultWasteLbs}),0)`.mapWith(Number),
      treesPlanted: sql<number>`coalesce(sum(${projects.resultTreesPlanted}),0)`.mapWith(Number),
    })
    .from(projects);

  const [signupTotal] = await db.select({ n: count() }).from(signups);
  const [tapTotal] = await db.select({ n: sql<number>`coalesce(sum(${tags.taps}),0)`.mapWith(Number) }).from(tags);

  const allTrees = await db.select().from(trees);
  const treeIds = allTrees.map((t) => t.id);
  const lastWater = treeIds.length
    ? await db
        .select({ treeId: checkIns.treeId, last: sql<Date>`max(${checkIns.createdAt})` })
        .from(checkIns)
        .where(and(inArray(checkIns.treeId, treeIds), eq(checkIns.kind, "TREE_WATERING")))
        .groupBy(checkIns.treeId)
    : [];
  const lastMap = new Map(lastWater.map((r) => [r.treeId!, new Date(r.last)]));
  const now = Date.now();
  let surviving = 0, onTrack = 0;
  for (const t of allTrees) {
    if (t.status !== "DEAD") surviving++;
    const base = lastMap.get(t.id) ?? t.plantedAt ?? t.createdAt;
    if ((now - base.getTime()) / 86400000 <= t.wateringIntervalDays) onTrack++;
  }

  const neighborhoodsServed = await db
    .select({ name: neighborhoods.name, needScore: neighborhoods.needScore, n: count(projects.id) })
    .from(neighborhoods)
    .leftJoin(projects, and(eq(projects.neighborhoodId, neighborhoods.id), inArray(projects.status, ["PUBLISHED", "COMPLETED"])))
    .groupBy(neighborhoods.id)
    .orderBy(desc(neighborhoods.needScore));

  return {
    ...totals,
    signups: signupTotal.n,
    taps: tapTotal.n,
    trees: allTrees.length,
    treesSurviving: surviving,
    treesOnTrack: onTrack,
    neighborhoodsServed,
  };
}

// ---------- Admin ----------

export async function reviewQueue() {
  const rows = await db.query.projects.findMany({
    with: { neighborhood: true, signups: { columns: { id: true } }, adoptions: true, trees: true },
    orderBy: [desc(projects.priorityFlag), asc(projects.createdAt)],
  });
  return rows;
}

export async function adminProject(id: string) {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      neighborhood: true,
      signups: { orderBy: desc(signups.createdAt) },
      adoptions: { orderBy: desc(adoptionRequests.createdAt) },
      trees: { with: { checkIns: { orderBy: desc(checkIns.createdAt), limit: 1 } } },
      tags: true,
      checkIns: { orderBy: desc(checkIns.createdAt), limit: 20 },
      activity: { orderBy: desc(activity.createdAt) },
      notifications: { orderBy: desc(notifications.createdAt) },
    },
  });
}

export async function outbox(limit = 100) {
  return db.query.notifications.findMany({
    with: { project: { columns: { id: true, title: true } } },
    orderBy: desc(notifications.createdAt),
    limit,
  });
}

export async function allTreesWithWater() {
  const rows = await db.query.trees.findMany({
    with: { project: { columns: { id: true, title: true } }, checkIns: { orderBy: desc(checkIns.createdAt), limit: 1 }, tags: true },
    orderBy: asc(trees.label),
  });
  return rows;
}

export async function allTags() {
  return db.query.tags.findMany({
    with: { project: { columns: { id: true, title: true } }, tree: { columns: { id: true, label: true } } },
    orderBy: asc(tags.code),
  });
}
