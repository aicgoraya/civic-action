// Synthetic sample data (the problem statement asks for synthetic or
// sponsor-provided data). Neighborhood coordinates are real Houston
// locations; canopy / heat / litter scores are illustrative only.
//
// Run: npm run db:seed   (wipes and re-creates everything)

import { config } from "dotenv";
config({ path: ".env" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as s from "./schema";
import { sql } from "drizzle-orm";

const client = postgres(process.env.DIRECT_URL ?? process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: s });

const day = 86400000;
const now = new Date();
const d = (days: number, hour = 9) => {
  const x = new Date(now.getTime() + days * day);
  x.setHours(hour, 0, 0, 0);
  return x;
};

async function main() {
  console.log("Resetting tables…");
  await db.execute(sql`TRUNCATE notifications, activity, check_ins, tags, trees, adoption_requests, signups, projects, neighborhoods CASCADE`);

  // ---- Neighborhoods (need score = weighted heat + low canopy + litter) ----
  const nbRows = [
    // name, lat, lng, canopyPct, heatIndex, litterIndex
    ["Gulfton", 29.7246, -95.4868, 9, 88, 74],
    ["Sunnyside", 29.6567, -95.3665, 22, 71, 91],
    ["Kashmere Gardens", 29.8068, -95.3119, 17, 76, 82],
    ["Second Ward", 29.7493, -95.3352, 14, 79, 58],
    ["Alief", 29.7072, -95.5961, 13, 82, 63],
    ["Acres Homes", 29.8631, -95.4331, 31, 60, 77],
    ["Greenspoint", 29.9408, -95.4152, 11, 84, 69],
    ["Independence Heights", 29.8277, -95.4073, 19, 73, 66],
    ["Montrose", 29.7425, -95.3905, 34, 48, 28],
    ["The Heights", 29.7937, -95.3981, 38, 42, 24],
    ["Memorial", 29.7652, -95.5231, 52, 30, 12],
    ["Third Ward", 29.7250, -95.3600, 18, 75, 70],
  ] as const;

  const nbs = await db
    .insert(s.neighborhoods)
    .values(
      nbRows.map(([name, lat, lng, canopyPct, heatIndex, litterIndex]) => ({
        name,
        lat,
        lng,
        canopyPct,
        heatIndex,
        litterIndex,
        needScore: Math.round(0.4 * heatIndex + 0.35 * (100 - canopyPct * 1.8) + 0.25 * litterIndex),
      })),
    )
    .returning();
  const nb = Object.fromEntries(nbs.map((n) => [n.name, n]));

  // ---- Projects ----
  const P = async (v: s.NewProject) => (await db.insert(s.projects).values(v).returning())[0];

  const gulfton = await P({
    title: "Gulfton Hillcroft corridor cleanup",
    type: "CLEANUP",
    status: "PUBLISHED",
    description:
      "Litter and bulk-waste pickup along Hillcroft Ave between Bellaire Blvd and Gulfton St, plus the drainage ditch behind the apartments on Rookin St. Partnering with Gulfton Super Neighborhood Council; apartment management has agreed to let us stage from their lot.",
    address: "5900 Hillcroft Ave, Houston, TX 77036",
    lat: 29.7231,
    lng: -95.4893,
    neighborhoodId: nb["Gulfton"].id,
    siteOwnershipConfirmed: true,
    siteOwnerNote: "City ROW (Hillcroft) + Rookin Apartments mgmt letter on file",
    submitterKind: "PARTNER",
    submitterName: "Rosa Delgado",
    submitterOrg: "Gulfton Super Neighborhood Council",
    submitterEmail: "rosa@gulfton-snc.example",
    submitterPhone: "713-555-0142",
    submitterVerified: true,
    eventDate: d(12),
    durationHours: 3,
    volunteerEstimate: 40,
    toolsNeeded: "40 grabbers, 80 contractor bags, 10 rakes, 2 wheelbarrows — reserved at ToolBank (order #TB-4471)",
    wasteHandling: "SWMD heavy-trash pickup scheduled day-after at Rookin St staging area",
    safetyNotes: "High-traffic corridor: safety vests required, no work in the roadway, flaggers at Bellaire crossing. Water station at staging lot.",
    externalRefs: "311 SR #2026-118734 (illegal dumping, ditch); Volunteer Houston listing VH-88213",
    publishedAt: d(-6),
    priorityFlag: true,
    adoptedByOrg: "UH Honors College Service Corps",
    adoptedByName: "Priya Natarajan",
    adoptedByEmail: "priya@uh.example",
  });

  const kashmere = await P({
    title: "Kashmere Gardens shade trees — Lockwood Park edge",
    type: "TREE_PLANTING",
    status: "PUBLISHED",
    description:
      "Plant 12 native shade trees (live oak, cedar elm, bald cypress) along the Lockwood Dr frontage of the park to reduce surface temperature at the bus stop and playground. Each tree has a named neighbor steward committed to one year of watering.",
    address: "Lockwood Park, 5400 Lockwood Dr, Houston, TX 77026",
    lat: 29.8056,
    lng: -95.3147,
    neighborhoodId: nb["Kashmere Gardens"].id,
    siteOwnershipConfirmed: true,
    siteOwnerNote: "Houston Parks & Recreation planting permit PR-2026-0917",
    submitterKind: "PARTNER",
    submitterName: "Marcus Bell",
    submitterOrg: "Kashmere Gardens Civic Club",
    submitterEmail: "marcus@kgcivic.example",
    submitterVerified: true,
    eventDate: d(-20),
    durationHours: 4,
    volunteerEstimate: 25,
    toolsNeeded: "12 shovels, 12 five-gallon buckets, mulch (3 yd), stakes & ties — ToolBank order #TB-4402",
    wasteHandling: "Nursery pots returned to Trees For Houston; no waste expected",
    safetyNotes: "Call 811 completed (utility locate cleared 10/1). Heat protocol: shade tent, water every 30 min.",
    externalRefs: "Trees For Houston stock allocation TFH-2026-311",
    publishedAt: d(-30),
    priorityFlag: true,
    resultVolunteers: 23,
    resultHours: 92,
    resultTreesPlanted: 12,
  });

  const sunnyside = await P({
    title: "Reed Rd dumping site remediation",
    type: "ILLEGAL_DUMPING",
    status: "APPROVED",
    description:
      "Chronic illegal dumping site at the dead end of Reed Rd near the rail spur. Three 311 reports in 60 days. Plan: bulk removal with SWMD, then install 'No Dumping' signage and a camera mount; monthly volunteer sweep to keep it clear.",
    address: "Reed Rd & Scott St (dead end), Houston, TX 77051",
    lat: 29.6598,
    lng: -95.3598,
    neighborhoodId: nb["Sunnyside"].id,
    siteOwnershipConfirmed: true,
    siteOwnerNote: "City-owned lot (HCAD 0432110000012)",
    submitterKind: "PARTNER",
    submitterName: "Denise Carter",
    submitterOrg: "City of Houston SWMD — Neighborhood Services",
    submitterEmail: "denise.carter@houston.example",
    submitterVerified: true,
    eventDate: d(18),
    durationHours: 4,
    volunteerEstimate: 20,
    toolsNeeded: "Heavy-duty gloves, 2 dumpsters (SWMD), grabbers",
    wasteHandling: "SWMD roll-off dumpsters on-site; tires routed to tire recycler",
    safetyNotes: "Possible sharps and tires — closed-toe boots, puncture-resistant gloves, no minors. Site lead has first-aid kit.",
    externalRefs: "311 SR #2026-114220, #2026-116908, #2026-118002",
    priorityFlag: true,
  });

  const secondWard = await P({
    title: "Navigation Esplanade planter restoration",
    type: "BEAUTIFICATION",
    status: "SUBMITTED",
    description:
      "Replant and mulch the 14 raised planters along Navigation Blvd esplanade, repaint the bench backs, and remove graffiti from the bus shelter. Our student org has 30 members ready.",
    address: "Navigation Blvd Esplanade, Houston, TX 77003",
    lat: 29.7483,
    lng: -95.3338,
    neighborhoodId: nb["Second Ward"].id,
    submitterKind: "COMMUNITY_GROUP",
    submitterName: "Chloe Nguyen",
    submitterOrg: "UH Bauer Volunteer Network",
    submitterEmail: "chloe@uh.example",
    submitterPhone: "832-555-0199",
    volunteerEstimate: 30,
    eventDate: d(25, 8),
    priorityFlag: true,
  });

  const alief = await P({
    title: "Alief Brays Bayou bank cleanup",
    type: "CLEANUP",
    status: "NEEDS_INFO",
    description:
      "Trash removal along the bayou bank between Bellaire Blvd and Beechnut St behind the community center.",
    address: "Brays Bayou at Bellaire Blvd, Houston, TX 77072",
    lat: 29.7052,
    lng: -95.5942,
    neighborhoodId: nb["Alief"].id,
    submitterKind: "COMMUNITY_GROUP",
    submitterName: "Tuan Pham",
    submitterOrg: "Alief Young Professionals",
    submitterEmail: "tuan@aliefyp.example",
    reviewerNote:
      "Thanks Tuan — before we can approve: (1) bayou banks are Harris County Flood Control District property, please confirm you've contacted HCFCD for permission; (2) add a waste-handling plan (who hauls the bags?); (3) estimated volunteer count.",
    priorityFlag: true,
  });

  const heights = await P({
    title: "White Oak Bayou trail litter sweep",
    type: "CLEANUP",
    status: "COMPLETED",
    description: "Monthly sweep of the hike-and-bike trail from Studemont to Heights Blvd.",
    address: "White Oak Bayou Trail at Studemont St, Houston, TX 77007",
    lat: 29.7816,
    lng: -95.3878,
    neighborhoodId: nb["The Heights"].id,
    siteOwnershipConfirmed: true,
    submitterKind: "PARTNER",
    submitterName: "Jordan Lee",
    submitterOrg: "Houston Parks Board",
    submitterEmail: "jordan@houstonparksboard.example",
    submitterVerified: true,
    eventDate: d(-9),
    durationHours: 2,
    volunteerEstimate: 15,
    toolsNeeded: "Grabbers, bags",
    wasteHandling: "Parks Board trash pickup",
    safetyNotes: "Stay off the bayou slope; trail is shared with cyclists.",
    publishedAt: d(-40),
    resultVolunteers: 18,
    resultHours: 36,
    resultWasteLbs: 410,
  });

  await P({
    title: "Memorial Dr median wildflower planting",
    type: "BEAUTIFICATION",
    status: "DECLINED",
    description: "Plant wildflowers in the Memorial Dr median near Shepherd.",
    address: "Memorial Dr & Shepherd Dr, Houston, TX 77007",
    lat: 29.7636,
    lng: -95.4098,
    neighborhoodId: nb["Memorial"].id,
    submitterKind: "COMMUNITY_GROUP",
    submitterName: "Sam Ortiz",
    submitterOrg: "Memorial Garden Club",
    submitterEmail: "sam@memorialgc.example",
    reviewerNote:
      "Declined: medians on Memorial Dr are TxDOT/Public Works right-of-way and volunteers can't work there without a traffic-control plan. Happy to help you find an off-street site nearby.",
  });

  const greenspoint = await P({
    title: "Greenspoint Greens Bayou tree stewardship",
    type: "TREE_PLANTING",
    status: "SUBMITTED",
    description: "Plant 8 bald cypress along the detention pond behind the library.",
    address: "Greens Bayou at Imperial Valley Dr, Houston, TX 77060",
    lat: 29.9389,
    lng: -95.4131,
    neighborhoodId: nb["Greenspoint"].id,
    submitterKind: "PARTNER",
    submitterName: "Angela Okafor",
    submitterOrg: "Greenspoint District",
    submitterEmail: "angela@greenspoint.example",
    submitterVerified: false,
    eventDate: d(30),
    volunteerEstimate: 16,
    priorityFlag: true,
  });

  // ---- Signups (pathway 4) ----
  const vols = [
    ["Aidan Murphy", "aidan@uh.example"],
    ["Sathvik Rao", "sathvik@uh.example"],
    ["Maria Flores", "maria@uh.example"],
    ["Kushaagra Singh", "kush@uh.example"],
    ["Abdullah Goraya", "abdullah@uh.example"],
    ["Lena Park", "lena@example.com"],
    ["Devon Hill", "devon@example.com"],
  ];
  await db.insert(s.signups).values(
    vols.map(([name, email]) => ({ projectId: gulfton.id, name, email, waiverAccepted: true })),
  );
  await db.insert(s.signups).values(
    vols.slice(0, 4).map(([name, email]) => ({ projectId: heights.id, name, email, waiverAccepted: true })),
  );

  // ---- Adoption request (pathway 2) pending on the Sunnyside project ----
  await db.insert(s.adoptionRequests).values({
    projectId: sunnyside.id,
    orgName: "TSU Environmental Justice Society",
    contactName: "Imani Brooks",
    contactEmail: "imani@tsu.example",
    groupSize: 22,
    message: "We can commit to the monthly sweep for the rest of the semester and bring our own first-aid lead.",
  });

  // ---- Trees + stewards (Kashmere Gardens) ----
  const treeDefs: [string, string, string, string, number | null][] = [
    // label, species, steward, email, days since last watering (null = never)
    ["Live Oak #1 — bus stop", "Live oak", "Marcus Bell", "marcus@kgcivic.example", 2],
    ["Live Oak #2 — bus stop", "Live oak", "Gloria Bell", "gloria@example.com", 3],
    ["Cedar Elm #3 — playground", "Cedar elm", "Terrence Walker", "terrence@example.com", 1],
    ["Cedar Elm #4 — playground", "Cedar elm", "Terrence Walker", "terrence@example.com", 1],
    ["Bald Cypress #5 — swale", "Bald cypress", "Ms. Evelyn Price", "evelyn@example.com", 12], // overdue → checkpoint demo
    ["Live Oak #6 — east fence", "Live oak", "Jamal Green", "jamal@example.com", 5],
    ["Live Oak #7 — east fence", "Live oak", "Jamal Green", "jamal@example.com", 5],
    ["Cedar Elm #8 — parking", "Cedar elm", "Kashmere HS Eco Club", "ecoclub@kashmerehs.example", 4],
  ];
  const treeRows = await db
    .insert(s.trees)
    .values(
      treeDefs.map(([label, species, stewardName, stewardEmail]) => ({
        projectId: kashmere.id,
        label,
        species,
        stewardName,
        stewardEmail,
        commitmentAcceptedAt: d(-22),
        commitmentEndsAt: d(-20 + 365),
        plantedAt: d(-20),
        wateringIntervalDays: 7,
      })),
    )
    .returning();

  // watering history
  for (let i = 0; i < treeRows.length; i++) {
    const t = treeRows[i];
    const lastDays = treeDefs[i][4];
    if (lastDays == null) continue;
    const logs = [];
    for (let k = lastDays; k < 20; k += 7) {
      logs.push({
        kind: "TREE_WATERING" as const,
        source: "NFC" as const,
        treeId: t.id,
        projectId: kashmere.id,
        name: t.stewardName,
        note: k === lastDays ? "Looks healthy, new growth" : null,
        createdAt: d(-k, 18),
      });
    }
    if (logs.length) await db.insert(s.checkIns).values(logs);
  }

  // ---- NFC tags ----
  await db.insert(s.tags).values([
    { code: "gulfton-sign", label: "Yard sign — Gulfton staging lot", projectId: gulfton.id, taps: 0 },
    { code: "heights-sign", label: "Yard sign — White Oak trailhead", projectId: heights.id, taps: 18 },
    { code: "sunnyside-sign", label: "Yard sign — Reed Rd", projectId: sunnyside.id, taps: 0 },
    ...treeRows.map((t, i) => ({
      code: `tree-${i + 1}`,
      label: `Stake tag — ${t.label}`,
      treeId: t.id,
      projectId: kashmere.id,
      taps: 3,
    })),
    { code: "judge-demo", label: "Judge demo card → Gulfton cleanup", projectId: gulfton.id },
  ]);

  // volunteer check-ins on the completed project
  await db.insert(s.checkIns).values(
    vols.slice(0, 4).map(([name]) => ({
      kind: "VOLUNTEER_CHECKIN" as const,
      source: "NFC" as const,
      projectId: heights.id,
      name,
      createdAt: d(-9, 9),
    })),
  );

  // ---- Activity + notifications (so the audit trail / outbox aren't empty) ----
  const A = (projectId: string, actor: string, action: string, detail: string, daysAgo: number) => ({
    projectId, actor, action, detail, createdAt: d(-daysAgo, 11),
  });
  await db.insert(s.activity).values([
    A(gulfton.id, "Rosa Delgado", "SUBMITTED", "Gulfton Super Neighborhood Council submitted the project", 9),
    A(gulfton.id, "KHB staff", "SUBMITTER_VERIFIED", "Confirmed with SNC president by phone", 8),
    A(gulfton.id, "KHB staff", "DETAILS_ADDED", "Volunteer estimate 40; ToolBank order placed; SWMD pickup scheduled", 7),
    A(gulfton.id, "KHB staff", "APPROVED", "All publication checks passed", 6),
    A(gulfton.id, "KHB staff", "PUBLISHED", "Live in directory and map", 6),
    A(gulfton.id, "Priya Natarajan", "ADOPTION_REQUESTED", "UH Honors College Service Corps (35 people)", 5),
    A(gulfton.id, "KHB staff", "ADOPTION_APPROVED", "Group assigned as project lead", 4),
    A(kashmere.id, "Marcus Bell", "SUBMITTED", "Kashmere Gardens Civic Club submitted the project", 35),
    A(kashmere.id, "KHB staff", "SUBMITTER_VERIFIED", "Known partner", 34),
    A(kashmere.id, "system", "STEWARDS_ACCEPTED", "8/8 stewards accepted the 1-year commitment", 22),
    A(kashmere.id, "KHB staff", "APPROVED", "Permit PR-2026-0917 on file", 31),
    A(kashmere.id, "KHB staff", "PUBLISHED", "", 30),
    A(kashmere.id, "KHB staff", "COMPLETED", "12 trees planted, 23 volunteers", 19),
    A(alief.id, "Tuan Pham", "SUBMITTED", "", 4),
    A(alief.id, "KHB staff", "INFO_REQUESTED", "HCFCD permission, waste plan, volunteer count", 3),
    A(secondWard.id, "Chloe Nguyen", "SUBMITTED", "", 1),
    A(greenspoint.id, "Angela Okafor", "SUBMITTED", "", 0),
  ]);

  await db.insert(s.notifications).values([
    { kind: "SUBMISSION_ACK", to: "chloe@uh.example", subject: "We received your project: Navigation Esplanade planter restoration", body: "Hi Chloe, KHB received your project. A reviewer will verify the site before anything is published.", projectId: secondWard.id, createdAt: d(-1, 14) },
    { kind: "REVIEWER_ALERT", to: "projects@keephoustonbeautiful.example", subject: "[Review] New community project: Navigation Esplanade planter restoration", body: "UH Bauer Volunteer Network submitted a project in Second Ward (HIGH-NEED area).", projectId: secondWard.id, createdAt: d(-1, 14) },
    { kind: "INFO_REQUEST", to: "tuan@aliefyp.example", subject: "KHB needs more information: Alief Brays Bayou bank cleanup", body: alief.reviewerNote!, projectId: alief.id, createdAt: d(-3, 10) },
    { kind: "SIGNUP_CONFIRMATION", to: "lena@example.com", subject: "You're signed up: Gulfton Hillcroft corridor cleanup", body: "See you there. Tap the project sign to check in on the day.", projectId: gulfton.id, createdAt: d(-2, 16) },
    { kind: "TREE_CHECKPOINT", to: "evelyn@example.com", subject: "Watering check: Bald Cypress #5 — swale is 5 day(s) overdue", body: "Hi Ms. Evelyn Price, we haven't seen a watering log for Bald Cypress #5 in 12 days.", projectId: kashmere.id, createdAt: d(0, 7) },
  ]);

  console.log(`Seeded ${nbs.length} neighborhoods, 8 projects, ${treeRows.length} trees.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => client.end());
