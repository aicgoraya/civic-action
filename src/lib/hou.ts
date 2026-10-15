// Hou — scripted assistant. No model behind it: every answer is a template
// filled from the platform's own data. A production Hou would run on a
// hosted model with the same guardrail: it can look up and hand off,
// never approve or publish.

import { db, projects, neighborhoods, subscribers } from "@/db";
import { and, eq, gte, asc, count, sql } from "drizzle-orm";
import { impactStats } from "./queries";

export type HouReply = { text: string; cards?: { title: string; sub: string; href: string }[]; handoff?: boolean; expect?: "email" };

const fmt = (d: Date | null) => d ? d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }) : "Date TBD";

async function upcoming() {
  return db.query.projects.findMany({
    where: and(eq(projects.status, "PUBLISHED"), gte(projects.eventDate, new Date())),
    with: { neighborhood: true, signups: { columns: { id: true } } },
    orderBy: asc(projects.eventDate),
  });
}
const card = (p: Awaited<ReturnType<typeof upcoming>>[number]) => ({
  title: p.title, href: `/projects/${p.id}`,
  sub: `${fmt(p.eventDate)} · ${p.neighborhood?.name ?? ""} · ${p.signups.length}/${p.volunteerEstimate ?? "?"} volunteers`,
});

export async function houReply(q: string): Promise<HouReply> {
  const t = q.toLowerCase().trim();
  const emailMatch = t.match(/[\w.+-]+@[\w.-]+\.\w+/);

  if (/human|person|agent|staff|someone|call|phone|talk to/.test(t))
    return { text: "I'll hand you to KHB staff. Office hours are Mon–Fri 9–5; you can reach them at (713) 555-0188 or projects@keephoustonbeautiful.example.\n\nI've attached this conversation so you won't have to repeat yourself.", handoff: true };

  if (emailMatch) return status(emailMatch[0]);
  if (/status|my project|submitted|did you get|approved yet/.test(t))
    return { text: "Sure. What email did you submit it with?", expect: "email" };

  if (/dump|trash pile|illegal|tires|mattress/.test(t))
    return { text: "Two paths, depending on what you need:\n\n• Report it to the City so it gets picked up: Houston 311 (call 311 or houstontx.gov/311). KHB sees 311 reports and can turn repeat sites into projects.\n• If it's a site you'd clean with a group: propose a project and KHB will check ownership and arrange disposal.\n\nIf you're standing at a KHB project sign right now, tap it and use \"Report a problem\".", cards: [{ title: "Propose a project", sub: "KHB vets it with the City", href: "/propose" }] };

  if (/tree|water|steward|shade|plant/.test(t)) {
    const tp = (await upcoming()).filter((p) => p.type === "TREE_PLANTING");
    return { text: `Tree projects need a named steward who commits to one year of watering. You tap the tag on the stake each time you water, and KHB can see the tree is alive.\n\n${tp.length ? "Trees looking for stewards right now:" : "No tree projects open right now, but partners can submit one."}`, cards: tp.map(card) };
  }

  if (/adopt|lead|our group|org\b|club|church|team/.test(t)) {
    const open = (await upcoming()).filter((p) => !p.adoptedByOrg);
    return { text: `Groups can take responsibility for an approved project: recruit, run the day, report results. KHB stays the approver.${open.length ? "\n\nOpen for a group lead:" : "\n\nNothing open right now."}`, cards: [...open.map(card), { title: "See all", sub: "Projects needing a group lead", href: "/projects?adopt=1" }] };
  }

  if (/submit|propose|new project|site|idea/.test(t))
    return { text: "Depends who you are. Either way KHB reviews it before it's published; takes about a week.", cards: [{ title: "Submit a project", sub: "City department, civic club, school or nonprofit", href: "/submit" }, { title: "Propose a project", sub: "Community group with a site in mind", href: "/propose" }] };

  if (/impact|how many|numbers|stats|surviv/.test(t)) {
    const st = await impactStats();
    return { text: `So far: ${st.completed} projects completed, ${st.wasteLbs.toLocaleString()} lb of waste removed, ${st.treesSurviving} of ${st.trees} trees alive (${st.treesOnTrack} watered on schedule this week), ${st.volunteers} volunteers turned out.`, cards: [{ title: "Full impact report", sub: "Neighborhoods served, tree survival, need map", href: "/impact" }] };
  }

  if (/newsletter|text|remind|updates|email me/.test(t))
    return { text: "You can get a monthly email and a text the day before anything you join.", cards: [{ title: "Sign up for updates", sub: "Pick a neighborhood", href: "/updates" }] };

  if (/donat|sponsor|money|fund/.test(t))
    return { text: "Sponsorships start at $75: one tree, one year of stewardship.", cards: [{ title: "Partners & sponsors", sub: "Adopt a tree · sponsor a cleanup · neighborhood partner", href: "/partners" }] };

  if (/^(hi|hello|hey|yo)\b/.test(t) && t.length < 12)
    return { text: "Hi. I can find you a cleanup, explain tree stewardship, check on a project you submitted, or get you to a person. What do you need?" };

  const nbs = await db.select().from(neighborhoods);
  const nbHit = nbs.find((n) => t.includes(n.name.toLowerCase()));
  if (/near|cleanup|volunteer|join|weekend|saturday|event|find|opportun/.test(t) || nbHit) {
    const live = await upcoming();
    const list = nbHit ? live.filter((p) => p.neighborhoodId === nbHit.id) : live;
    if (nbHit && !list.length)
      return { text: `Nothing scheduled in ${nbHit.name} yet. Closest upcoming:`, cards: [...live.slice(0, 2).map(card), { title: `Get updates for ${nbHit.name}`, sub: "We'll tell you when something opens", href: "/updates" }] };
    return { text: nbHit ? `In ${nbHit.name}:` : "Upcoming projects you can join. Tell me a neighborhood to narrow it down.", cards: list.slice(0, 3).map(card) };
  }

  return { text: "I'm not sure I follow. I can help with:\n\n• finding a cleanup or tree planting to join\n• adopting or proposing a project\n• checking the status of something you submitted\n• reporting dumping\n• reaching KHB staff\n\nWhich one?" };
}

async function status(email: string): Promise<HouReply> {
  const mine = await db.query.projects.findMany({ where: sql`lower(${projects.submitterEmail}) = ${email.toLowerCase()}`, with: { signups: { columns: { id: true } } } });
  if (!mine.length) return { text: `I don't see any projects submitted with ${email}. If you used a different email, try that one.`, cards: [{ title: "Submit a new project", sub: "For partners", href: "/submit" }] };
  const line = (p: (typeof mine)[number]) => ({
    SUBMITTED: "waiting for a KHB reviewer", NEEDS_INFO: `KHB asked for more info: "${p.reviewerNote ?? ""}"`, APPROVED: "approved, publishing once logistics are confirmed",
    PUBLISHED: `live, ${p.signups.length} volunteers signed up`, COMPLETED: "completed", DECLINED: `declined: "${p.reviewerNote ?? ""}"`,
  })[p.status];
  return { text: `Found ${mine.length} project${mine.length > 1 ? "s" : ""} under ${email}:`, cards: mine.map((p) => ({ title: p.title, sub: line(p), href: `/projects/${p.id}` })) };
}

export async function liveFeed() {
  const rows = await db.query.checkIns.findMany({ with: { project: { columns: { id: true, title: true } }, tree: { columns: { id: true, label: true } } }, orderBy: (c, { desc }) => desc(c.createdAt), limit: 10 });
  return rows;
}

export async function subscriberCount() {
  const [r] = await db.select({ n: count() }).from(subscribers);
  return r.n;
}
