import Link from "next/link";
import { impactStats, allNeighborhoods, publicProjects, allTreesWithWater } from "@/lib/queries";
import { liveFeed } from "@/lib/hou";
import { treeHealth } from "@/lib/automations";
import { ProjectMap } from "@/components/MapClient";
import { PROJECT_TYPE_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live field view" };

// Projector screen for the demo table. Big type, dark, auto-refreshes.
/* eslint-disable react-hooks/purity -- server component; clock values are intentional */
export default async function LivePage() {
  const [st, nbs, pub, trees, feed] = await Promise.all([impactStats(), allNeighborhoods(), publicProjects(), allTreesWithWater(), liveFeed()]);
  const markers = pub.filter((p) => p.lat != null && p.lng != null).map((p) => ({ id: p.id, title: p.title, lat: p.lat!, lng: p.lng!, type: p.type, status: p.status, priority: p.priorityFlag, href: `/projects/${p.id}`, subtitle: PROJECT_TYPE_LABEL[p.type] }));
  const withH = trees.map((t) => ({ t, h: treeHealth(t, t.checkIns[0]?.createdAt ?? null) }));
  const over = withH.filter((x) => !x.h.onTrack && x.t.status !== "DEAD").length;
  const ago = (d: Date) => { const m = (Date.now() - d.getTime()) / 6e4; return m < 1 ? "just now" : m < 60 ? `${Math.floor(m)} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" }); };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#14211a] px-6 py-5 text-[#eef2ee]">
      <meta httpEquiv="refresh" content="8" />
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Keep Houston Beautiful · live field view</h1>
        <span className="text-sm text-[#b7c4bb] tabular-nums">{new Date().toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })} · refreshes every 8 s</span>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi n={<>{st.treesSurviving}<span className="text-[.5em] opacity-60">/{st.trees}</span></>} label="trees alive · verified by steward taps" tone="g" />
        <Kpi n={over} label="trees overdue for watering" tone={over ? "v" : "g"} />
        <Kpi n={st.wasteLbs.toLocaleString()} label="lb of waste removed" />
        <Kpi n={st.taps} label="field taps logged" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="[&_.leaflet-container]:bg-[#1b2a21]"><ProjectMap markers={markers} neighborhoods={nbs} height={460} /></div>
          <div className="mt-4 rounded-lg border border-[#2c3a31] bg-[#1b2a21]">
            <h2 className="border-b border-[#2c3a31] px-3.5 py-2.5 text-[13px] font-semibold tracking-wide text-[#b7c4bb]">TREE STEWARDSHIP · {trees.length} trees</h2>
            <div className="flex flex-wrap gap-2 p-3.5">
              {withH.map(({ t, h }) => (
                <Link key={t.id} href={t.tags[0] ? `/t/${t.tags[0].code}` : `/trees/${t.id}`} className="flex items-center gap-2 rounded-full border border-[#2c3a31] bg-[#121a15] py-1 pl-2 pr-3 text-[13px] no-underline">
                  <span className={`h-3 w-3 rounded-full ${t.status === "DEAD" ? "bg-[#5a6a60]" : h.onTrack ? "bg-[#5fcf93]" : "bg-vest animate-ping-slow"}`} />
                  {t.label.split(" — ")[0]}<span className="opacity-50">· {h.daysSinceWater}d</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[#2c3a31] bg-[#1b2a21]">
          <h2 className="border-b border-[#2c3a31] px-3.5 py-2.5 text-[13px] font-semibold tracking-wide text-[#b7c4bb]">FIELD ACTIVITY</h2>
          {feed.length === 0 && <div className="px-3.5 py-3 text-sm text-[#b7c4bb]">Waiting for the first tap.</div>}
          {feed.map((c, i) => (
            <div key={c.id} className={`grid grid-cols-[5.5rem_1fr] gap-2.5 border-t border-[#2c3a31] px-3.5 py-2.5 text-sm first:border-t-0 ${i === 0 && Date.now() - c.createdAt.getTime() < 60000 ? "bg-[#2f5a3f]" : ""}`}>
              <span className="text-[#8fa497] tabular-nums">{ago(c.createdAt)}</span>
              <span>
                <b>{c.name}</b> {c.kind === "TREE_WATERING" ? <>watered <b>{c.tree?.label}</b></> : c.kind === "VOLUNTEER_CHECKIN" ? <>checked in at <b>{c.project?.title}</b></> : <>reported an issue{c.tree ? ` on ${c.tree.label}` : c.project ? ` at ${c.project.title}` : ""}</>}
                {c.note && <div className="text-[13px] text-[#b7c4bb]">“{c.note}”</div>}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs text-[#8fa497]">Every row above came from a phone tapping a physical tag. Nothing on this screen is entered by staff.</p>
    </div>
  );
}

function Kpi({ n, label, tone }: { n: React.ReactNode; label: string; tone?: "g" | "v" }) {
  return (
    <div className="rounded-lg border border-[#2c3a31] bg-[#1b2a21] px-4 py-3.5">
      <div className={`text-[clamp(32px,4.5vw,52px)] font-extrabold leading-none tabular-nums ${tone === "g" ? "text-[#5fcf93]" : tone === "v" ? "text-vest" : ""}`}>{n}</div>
      <div className="mt-1 text-[13px] text-[#b7c4bb]">{label}</div>
    </div>
  );
}
