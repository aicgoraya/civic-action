import Link from "next/link";
import { publicProjects, allNeighborhoods } from "@/lib/queries";
import { ProjectRow, PageHeader, Notice } from "@/components/ui";
import { ProjectMap } from "@/components/MapClient";
import { PROJECT_TYPE_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ adopt?: string; view?: string; type?: string }> }) {
  const sp = await searchParams;
  const [all, nbs] = await Promise.all([publicProjects(), allNeighborhoods()]);
  const adoptMode = sp.adopt === "1";
  const filtered = all
    .filter((p) => (sp.type ? p.type === sp.type : true))
    .filter((p) => (adoptMode ? p.status === "PUBLISHED" && !p.adoptedByOrg : true));
  const upcoming = filtered.filter((p) => p.status === "PUBLISHED");
  const done = filtered.filter((p) => p.status === "COMPLETED");
  const markers = filtered
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id, title: p.title, lat: p.lat!, lng: p.lng!, type: p.type, status: p.status, priority: p.priorityFlag,
      href: adoptMode ? `/projects/${p.id}/adopt` : `/projects/${p.id}`,
      subtitle: `${PROJECT_TYPE_LABEL[p.type]}${p.neighborhood ? " · " + p.neighborhood.name : ""}`,
    }));

  const types = Object.entries(PROJECT_TYPE_LABEL);
  const view = sp.view === "map" ? "map" : "list";
  const qs = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ adopt: sp.adopt, type: sp.type, view: sp.view, ...o })) if (v) u.set(k, v);
    const s = u.toString();
    return `/projects${s ? "?" + s : ""}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <PageHeader
        title={adoptMode ? "Projects looking for a group to lead them" : "Approved projects"}
        lede={
          adoptMode
            ? "These are approved by KHB and need a community group to take responsibility: recruit volunteers, run the day, report results."
            : "Everything here has been reviewed by Keep Houston Beautiful: site permission confirmed, tools and waste pickup arranged, safety plan in place."
        }
      />
      {adoptMode && (
        <div className="mb-4">
          <Notice>
            Don&apos;t see the right site? <Link href="/propose" className="font-medium underline">Propose a new project</Link> and KHB will vet it.
          </Notice>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex rounded-sm border border-line bg-paper p-0.5 text-sm">
          <Link href={qs({ view: undefined })} className={`px-3 py-1 rounded-[4px] ${view === "list" ? "bg-ink text-white" : ""}`}>List</Link>
          <Link href={qs({ view: "map" })} className={`px-3 py-1 rounded-[4px] ${view === "map" ? "bg-ink text-white" : ""}`}>Map</Link>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Link href={qs({ type: undefined })} className={`px-2.5 py-1 rounded-full border ${!sp.type ? "bg-ink text-white border-ink" : "border-line bg-paper"}`}>All</Link>
          {types.map(([k, label]) => (
            <Link key={k} href={qs({ type: k })} className={`px-2.5 py-1 rounded-full border ${sp.type === k ? "bg-ink text-white border-ink" : "border-line bg-paper"}`}>
              {label}
            </Link>
          ))}
        </div>
        <Link href={adoptMode ? qs({ adopt: undefined }) : qs({ adopt: "1" })} className="ml-auto text-sm text-green font-medium">
          {adoptMode ? "Show all projects" : "Needs a group lead"}
        </Link>
      </div>

      {view === "map" ? (
        <ProjectMap markers={markers} neighborhoods={nbs} height={560} />
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-ink-soft mb-2">Upcoming · {upcoming.length}</h2>
            <div className="space-y-2">
              {upcoming.length === 0 && <p className="card p-4 text-sm text-ink-soft">Nothing here yet.</p>}
              {upcoming.map((p) => (
                <ProjectRow key={p.id} p={p} neighborhood={p.neighborhood?.name} signupCount={p.signups.length}
                  href={adoptMode ? `/projects/${p.id}/adopt` : undefined} />
              ))}
            </div>
          </section>
          {!adoptMode && done.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold text-ink-soft mb-2">Completed · {done.length}</h2>
              <div className="space-y-2 opacity-80">
                {done.map((p) => <ProjectRow key={p.id} p={p} neighborhood={p.neighborhood?.name} signupCount={p.signups.length} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
