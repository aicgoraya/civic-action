import Link from "next/link";
import { upcomingProjects, impactStats, allNeighborhoods, publicProjects } from "@/lib/queries";
import { ProjectRow } from "@/components/ui";
import { ProjectMap } from "@/components/MapClient";
import { PROJECT_TYPE_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

const doors = [
  {
    href: "/submit",
    verb: "Submit a project",
    who: "Partners",
    what: "City departments, civic clubs, schools and nonprofits send KHB a site that needs a cleanup, planting or fix.",
  },
  {
    href: "/projects?adopt=1",
    verb: "Adopt a project",
    who: "Community groups",
    what: "Student orgs, churches and neighborhood groups take responsibility for an approved project.",
  },
  {
    href: "/propose",
    verb: "Propose a project",
    who: "Community groups",
    what: "Have a site in mind that isn't listed? Propose it and KHB will vet it with the City.",
  },
  {
    href: "/projects",
    verb: "Join a cleanup",
    who: "Volunteers",
    what: "Pick a date, sign the waiver, show up, tap the sign to check in.",
  },
];

export default async function Home() {
  const [upcoming, stats, nbs, all] = await Promise.all([upcomingProjects(4), impactStats(), allNeighborhoods(), publicProjects()]);
  const markers = all
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id, title: p.title, lat: p.lat!, lng: p.lng!, type: p.type, status: p.status,
      priority: p.priorityFlag, href: `/projects/${p.id}`,
      subtitle: `${PROJECT_TYPE_LABEL[p.type]}${p.neighborhood ? " · " + p.neighborhood.name : ""}`,
    }));

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* The front door */}
      <section className="pt-8 sm:pt-12">
        <p className="text-ink-soft text-sm max-w-prose">
          Keep Houston Beautiful reviews every project here before it goes live, so a reported need becomes a safe, approved
          event with tools, waste pickup and a plan.
        </p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold leading-[1.05] max-w-[18ch]">
          One front door for fixing up Houston.
        </h1>
        <ul className="mt-8 border-t border-ink/20">
          {doors.map((d) => (
            <li key={d.href} className="border-b border-ink/20">
              <Link
                href={d.href}
                className="group grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-x-8 gap-y-1 items-center py-5 sm:py-6 hover:bg-paper transition-colors -mx-4 px-4"
              >
                <div>
                  <span className="block text-xs text-ink-soft">{d.who}</span>
                  <span className="block text-2xl sm:text-3xl font-bold leading-tight group-hover:text-green">{d.verb}</span>
                </div>
                <p className="text-sm sm:text-[15px] text-ink-soft max-w-prose">{d.what}</p>
                <span aria-hidden className="hidden sm:block text-2xl text-ink/30 group-hover:text-green group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Happening soon + map */}
      <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold">Happening soon</h2>
            <Link href="/projects" className="text-sm text-green font-medium">All projects</Link>
          </div>
          <div className="mt-3 space-y-2">
            {upcoming.length === 0 && (
              <p className="card p-4 text-sm text-ink-soft">No published projects yet. Partners can submit one above.</p>
            )}
            {upcoming.map((p) => (
              <ProjectRow key={p.id} p={p} neighborhood={p.neighborhood?.name} signupCount={p.signups.length} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold">Where the need is</h2>
          <p className="text-sm text-ink-soft mt-1 mb-3 max-w-prose">
            Orange areas have the least tree canopy, the hottest summers and the most litter reports. Projects there are flagged for priority review.
          </p>
          <ProjectMap markers={markers} neighborhoods={nbs} height={360} />
        </div>
      </section>

      {/* Impact strip */}
      <section className="mt-14 card p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">What&apos;s been done so far</h2>
          <Link href="/impact" className="text-sm text-green font-medium">Full impact report</Link>
        </div>
        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-y-5">
          <Stat n={stats.completed} label="projects completed" />
          <Stat n={stats.wasteLbs.toLocaleString()} label="lb of waste removed" />
          <Stat n={`${stats.treesSurviving}/${stats.trees}`} label="trees planted & surviving" />
          <Stat n={stats.volunteers} label="volunteers turned out" />
        </dl>
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: string | number; label: string }) {
  return (
    <div>
      <dd className="text-3xl font-bold tabular-nums">{n}</dd>
      <dt className="text-sm text-ink-soft">{label}</dt>
    </div>
  );
}
