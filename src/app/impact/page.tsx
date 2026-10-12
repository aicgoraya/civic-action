import { impactStats, allNeighborhoods, publicProjects } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ProjectMap } from "@/components/MapClient";
import { PROJECT_TYPE_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impact" };

export default async function ImpactPage() {
  const [s, nbs, all] = await Promise.all([impactStats(), allNeighborhoods(), publicProjects()]);
  const markers = all.filter((p) => p.lat != null && p.lng != null).map((p) => ({
    id: p.id, title: p.title, lat: p.lat!, lng: p.lng!, type: p.type, status: p.status, priority: p.priorityFlag, href: `/projects/${p.id}`,
    subtitle: PROJECT_TYPE_LABEL[p.type],
  }));
  const served = s.neighborhoodsServed.filter((n) => n.n > 0);
  const highNeedServed = served.filter((n) => n.needScore >= 65).length;
  const highNeedTotal = s.neighborhoodsServed.filter((n) => n.needScore >= 65).length;
  const maxN = Math.max(1, ...s.neighborhoodsServed.map((n) => n.n));

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <PageHeader title="Impact" lede="Every number here comes from the project records: results KHB enters at completion, volunteer sign-ups, and taps on the physical tags in the field. Formatted to feed the Texas Litter Database and KHB's annual report." />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile n={s.completed} label="projects completed" sub={`${s.live} live · ${s.inReview} in review`} />
        <Tile n={s.wasteLbs.toLocaleString()} label="lb of waste removed" sub={`${(s.wasteLbs / 2000).toFixed(1)} tons`} />
        <Tile n={s.volunteers} label="volunteers turned out" sub={`${s.hours.toLocaleString()} volunteer hours`} />
        <Tile n={s.signups} label="sign-ups for upcoming" sub={`${s.taps} tag taps in the field`} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold text-lg">Trees planted and surviving</h2>
          <div className="mt-3 flex items-end gap-6">
            <div><div className="text-4xl font-bold tabular-nums">{s.treesSurviving}<span className="text-ink-soft text-2xl">/{s.trees}</span></div><div className="text-sm text-ink-soft">alive</div></div>
            <div><div className="text-4xl font-bold tabular-nums">{s.treesOnTrack}</div><div className="text-sm text-ink-soft">watered on schedule this week</div></div>
          </div>
          <div className="mt-4 h-3 w-full rounded-full bg-line overflow-hidden flex">
            <div className="h-full bg-green" style={{ width: `${s.trees ? (s.treesOnTrack / s.trees) * 100 : 0}%` }} title="On schedule" />
            <div className="h-full bg-vest" style={{ width: `${s.trees ? ((s.treesSurviving - s.treesOnTrack) / s.trees) * 100 : 0}%` }} title="Overdue" />
          </div>
          <p className="hint">Survival is verified by steward tap-ins, not assumed. Most community plantings lose trees in year one because nobody is accountable for watering; the tag makes it visible.</p>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-lg">Neighborhoods served</h2>
          <p className="text-sm text-ink-soft">{served.length} of {s.neighborhoodsServed.length} sample neighborhoods · {highNeedServed}/{highNeedTotal} high-need areas reached</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {s.neighborhoodsServed.map((n) => (
              <li key={n.name} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2">
                <span className="truncate">{n.name}</span>
                <span className="h-2.5 rounded-sm bg-line overflow-hidden">
                  <span className={`block h-full ${n.needScore >= 65 ? "bg-vest" : "bg-green"}`} style={{ width: `${(n.n / maxN) * 100}%` }} />
                </span>
                <span className="tabular-nums text-ink-soft w-16 text-right">{n.n} · need {Math.round(n.needScore)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-bold text-lg mb-2">Where projects landed vs. where the need is</h2>
        <ProjectMap markers={markers} neighborhoods={nbs} height={460} />
      </section>

      <section className="mt-8 card p-5 text-sm">
        <h2 className="font-bold text-lg">How need is scored</h2>
        <p className="mt-1 max-w-prose text-ink-soft">
          Need score = 0.40 × heat vulnerability + 0.35 × canopy deficit + 0.25 × litter &amp; dumping report density, each 0–100. Projects in areas scoring 65+ are flagged for priority review.
          In production the inputs would come from the Houston Health Department heat-vulnerability index, Houston Parks Board canopy data and 311 service-request density; here they are synthetic.
        </p>
      </section>
    </div>
  );
}

function Tile({ n, label, sub }: { n: string | number; label: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-3xl font-bold tabular-nums">{n}</div>
      <div className="text-sm">{label}</div>
      {sub && <div className="text-xs text-ink-soft mt-1">{sub}</div>}
    </div>
  );
}
