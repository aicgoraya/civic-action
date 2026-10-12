// Civic Action Platform — data model (Drizzle ORM / Postgres)
//
// One shared "project record" links submitter, site, approval status,
// resources, community group, volunteer registration and results
// (per the KHB problem statement, "Recommended Steps").

import {
  pgTable,
  pgEnum,
  text,
  integer,
  real,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------- Enums ----------

export const projectType = pgEnum("project_type", [
  "CLEANUP", // litter removal / neighborhood cleanup
  "TREE_PLANTING", // requires a named steward (1-year commitment)
  "BEAUTIFICATION", // painting, mulching, garden beds
  "ILLEGAL_DUMPING", // dumping site remediation
]);

export const projectStatus = pgEnum("project_status", [
  "SUBMITTED", // waiting for KHB review
  "NEEDS_INFO", // KHB requested edits; submitter must respond
  "APPROVED", // KHB approved but not yet visible to the public
  "PUBLISHED", // live in the public directory / map
  "COMPLETED", // event happened; results recorded
  "DECLINED", // KHB declined
]);

export const submitterKind = pgEnum("submitter_kind", [
  "PARTNER", // approved / invited partner (city dept, civic club, school)
  "COMMUNITY_GROUP", // student org, church, neighborhood association
]);

export const adoptionStatus = pgEnum("adoption_status", [
  "PENDING",
  "APPROVED",
  "DECLINED",
]);

export const checkInKind = pgEnum("checkin_kind", [
  "VOLUNTEER_CHECKIN", // tapped the sign at the project site
  "TREE_WATERING", // steward tapped the tree-stake tag
  "ISSUE_REPORT", // something is wrong (dumping returned, tree damaged)
]);

export const checkInSource = pgEnum("checkin_source", ["NFC", "WEB"]);

export const notificationKind = pgEnum("notification_kind", [
  "SUBMISSION_ACK",
  "REVIEWER_ALERT",
  "INFO_REQUEST",
  "APPROVED",
  "DECLINED",
  "PUBLISHED",
  "ADOPTION_RECEIVED",
  "ADOPTION_DECISION",
  "SIGNUP_CONFIRMATION",
  "EVENT_REMINDER",
  "TREE_CHECKPOINT",
  "STEWARD_WELCOME",
]);

const id = () =>
  text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`);

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------- Core records ----------

export const neighborhoods = pgTable("neighborhoods", {
  id: id(),
  name: text("name").notNull().unique(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  canopyPct: real("canopy_pct").notNull(), // % tree canopy (synthetic)
  heatIndex: real("heat_index").notNull(), // 0-100 heat vulnerability (synthetic)
  litterIndex: real("litter_index").notNull(), // 0-100 dumping/litter density (synthetic)
  needScore: real("need_score").notNull(), // composite 0-100, higher = higher need
});

export const projects = pgTable(
  "projects",
  {
    id: id(),
    title: text("title").notNull(),
    type: projectType("type").notNull(),
    status: projectStatus("status").notNull().default("SUBMITTED"),
    description: text("description").notNull(),

    // Site
    address: text("address").notNull(),
    lat: real("lat"),
    lng: real("lng"),
    neighborhoodId: text("neighborhood_id").references(() => neighborhoods.id),
    siteOwnershipConfirmed: boolean("site_ownership_confirmed")
      .notNull()
      .default(false),
    siteOwnerNote: text("site_owner_note"),

    // Submitter (pathway 1 = partner, pathway 3 = community group proposal)
    submitterKind: submitterKind("submitter_kind").notNull(),
    submitterName: text("submitter_name").notNull(),
    submitterOrg: text("submitter_org").notNull(),
    submitterEmail: text("submitter_email").notNull(),
    submitterPhone: text("submitter_phone"),
    submitterVerified: boolean("submitter_verified").notNull().default(false),

    // Scope & logistics (KHB can add/edit during review)
    eventDate: timestamp("event_date", { withTimezone: true }),
    durationHours: real("duration_hours"),
    volunteerEstimate: integer("volunteer_estimate"),
    toolsNeeded: text("tools_needed"), // "20 grabbers, 40 bags (ToolBank)"
    wasteHandling: text("waste_handling"), // "SWMD bulk pickup requested"
    safetyNotes: text("safety_notes"),
    externalRefs: text("external_refs"), // 311 SR #, Volunteer Houston link (mock)
    reviewerNote: text("reviewer_note"), // last message from KHB to submitter

    // Publication
    publishedAt: timestamp("published_at", { withTimezone: true }),
    priorityFlag: boolean("priority_flag").notNull().default(false),

    // Adoption by a community group (pathway 2)
    adoptedByOrg: text("adopted_by_org"),
    adoptedByName: text("adopted_by_name"),
    adoptedByEmail: text("adopted_by_email"),

    // Results (recorded at completion)
    resultVolunteers: integer("result_volunteers"),
    resultHours: real("result_hours"),
    resultWasteLbs: real("result_waste_lbs"),
    resultTreesPlanted: integer("result_trees_planted"),

    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("projects_status_idx").on(t.status)],
);

// Pathway 4: individual volunteer joins a published project
export const signups = pgTable(
  "signups",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    waiverAccepted: boolean("waiver_accepted").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("signups_project_email").on(t.projectId, t.email)],
);

// Pathway 2: community group requests responsibility for an approved project
export const adoptionRequests = pgTable("adoption_requests", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  orgName: text("org_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  groupSize: integer("group_size").notNull(),
  message: text("message"),
  status: adoptionStatus("status").notNull().default("PENDING"),
  decisionNote: text("decision_note"),
  createdAt: createdAt(),
});

// Tree projects require a named steward who accepts one year of watering/monitoring
export const trees = pgTable("trees", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // "Live Oak #3, east fence"
  species: text("species"),
  stewardName: text("steward_name").notNull(),
  stewardEmail: text("steward_email").notNull(),
  stewardPhone: text("steward_phone"),
  commitmentAcceptedAt: timestamp("commitment_accepted_at", {
    withTimezone: true,
  }), // null until steward accepts the 1-year pledge
  commitmentEndsAt: timestamp("commitment_ends_at", { withTimezone: true }),
  plantedAt: timestamp("planted_at", { withTimezone: true }),
  wateringIntervalDays: integer("watering_interval_days").notNull().default(7),
  status: text("status").notNull().default("PLANTED"), // PLANTED | STRUGGLING | DEAD | ESTABLISHED
  createdAt: createdAt(),
});

// Physical NFC sticker. URL written on the tag = /t/<code>
export const tags = pgTable("tags", {
  id: id(),
  code: text("code").notNull().unique(), // short, printable: "khb-7f3a"
  label: text("label"),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  treeId: text("tree_id").references(() => trees.id, { onDelete: "cascade" }),
  taps: integer("taps").notNull().default(0),
  createdAt: createdAt(),
});

export const checkIns = pgTable(
  "check_ins",
  {
    id: id(),
    kind: checkInKind("kind").notNull(),
    source: checkInSource("source").notNull().default("WEB"),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    treeId: text("tree_id").references(() => trees.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("checkins_tree_idx").on(t.treeId, t.createdAt),
    index("checkins_project_idx").on(t.projectId, t.createdAt),
  ],
);

// Audit trail of every human decision + automation on a project
export const activity = pgTable(
  "activity",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actor: text("actor").notNull(), // "KHB staff", "system", submitter name
    action: text("action").notNull(),
    detail: text("detail"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_project_idx").on(t.projectId, t.createdAt)],
);

// Simulated outbox. In production this is an email/SMS provider; for the
// prototype every automation writes here so reviewers can see it.
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    kind: notificationKind("kind").notNull(),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_created_idx").on(t.createdAt)],
);

// ---------- Relations ----------

export const neighborhoodRelations = relations(neighborhoods, ({ many }) => ({
  projects: many(projects),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  neighborhood: one(neighborhoods, {
    fields: [projects.neighborhoodId],
    references: [neighborhoods.id],
  }),
  signups: many(signups),
  adoptions: many(adoptionRequests),
  trees: many(trees),
  checkIns: many(checkIns),
  activity: many(activity),
  tags: many(tags),
  notifications: many(notifications),
}));

export const signupRelations = relations(signups, ({ one }) => ({
  project: one(projects, { fields: [signups.projectId], references: [projects.id] }),
}));

export const adoptionRelations = relations(adoptionRequests, ({ one }) => ({
  project: one(projects, {
    fields: [adoptionRequests.projectId],
    references: [projects.id],
  }),
}));

export const treeRelations = relations(trees, ({ one, many }) => ({
  project: one(projects, { fields: [trees.projectId], references: [projects.id] }),
  checkIns: many(checkIns),
  tags: many(tags),
}));

export const tagRelations = relations(tags, ({ one }) => ({
  project: one(projects, { fields: [tags.projectId], references: [projects.id] }),
  tree: one(trees, { fields: [tags.treeId], references: [trees.id] }),
}));

export const checkInRelations = relations(checkIns, ({ one }) => ({
  project: one(projects, { fields: [checkIns.projectId], references: [projects.id] }),
  tree: one(trees, { fields: [checkIns.treeId], references: [trees.id] }),
}));

export const activityRelations = relations(activity, ({ one }) => ({
  project: one(projects, { fields: [activity.projectId], references: [projects.id] }),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  project: one(projects, {
    fields: [notifications.projectId],
    references: [projects.id],
  }),
}));

// ---------- Types ----------
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Neighborhood = typeof neighborhoods.$inferSelect;
export type Tree = typeof trees.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type Signup = typeof signups.$inferSelect;
export type AdoptionRequest = typeof adoptionRequests.$inferSelect;
export type Activity = typeof activity.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ProjectStatus = Project["status"];
export type ProjectType = Project["type"];
