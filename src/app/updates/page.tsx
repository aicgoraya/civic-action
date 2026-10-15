import { allNeighborhoods, upcomingProjects } from "@/lib/queries";
import { subscriberCount } from "@/lib/hou";
import { db, projects } from "@/db";
import { eq, desc } from "drizzle-orm";
import { PageHeader, Notice, fmtDate } from "@/components/ui";
import { SubscribeForm } from "@/components/forms/SubscribeForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Community updates" };

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const [nbs, up, n] = await Promise.all([allNeighborhoods(), upcomingProjects(5), subscriberCount()]);
  const done = await db.query.projects.findMany({ where: eq(projects.status, "COMPLETED"), orderBy: desc(projects.eventDate), limit: 3 });
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <PageHeader title="Community updates" lede="One email a month, a text the day before anything you signed up for. Pick a neighborhood and we'll only tell you about projects near you." />
      {sp.ok && <div className="mb-4"><Notice tone="success"><b>You&apos;re on the list.</b> Confirmation sent to {sp.ok}.</Notice></div>}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card p-5 self-start"><SubscribeForm neighborhoods={nbs.map((x) => ({ id: x.id, name: x.name }))} count={n} /></div>
        <section>
          <h2 className="text-xl font-bold">This month</h2>
          <div className="card p-4 mt-3 grid gap-4">
            <div><div className="text-xs text-ink-soft tracking-wide">UPCOMING</div>{up.map((p) => <a key={p.id} href={`/projects/${p.id}`} className="block py-2 border-b border-line"><b>{p.title}</b><div className="text-sm text-ink-soft">{fmtDate(p.eventDate)} · {p.neighborhood?.name}</div></a>)}</div>
            <div><div className="text-xs text-ink-soft tracking-wide">RECENTLY COMPLETED</div>{done.map((p) => <div key={p.id} className="py-2 border-b border-line"><b>{p.title}</b><div className="text-sm text-ink-soft">{p.resultVolunteers ?? 0} volunteers{p.resultWasteLbs ? ` · ${p.resultWasteLbs} lb removed` : ""}{p.resultTreesPlanted ? ` · ${p.resultTreesPlanted} trees planted` : ""}</div></div>)}</div>
            <div><div className="text-xs text-ink-soft tracking-wide">VOLUNTEER SPOTLIGHT</div><p className="text-sm mt-1"><b>Ms. Evelyn Price, Kashmere Gardens.</b> Adopted a bald cypress at Lockwood Park in September and has logged every watering since. “I pass it on the way to the bus. Takes two minutes.”</p></div>
          </div>
        </section>
      </div>
    </div>
  );
}
