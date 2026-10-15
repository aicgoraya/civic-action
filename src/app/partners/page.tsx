import { PageHeader, Notice, Dl } from "@/components/ui";

export const metadata = { title: "Partners & sponsors" };

const tiers = [
  ["Adopt a tree", "$75", "Covers one native shade tree, stake, mulch and its NFC stewardship tag for a year."],
  ["Sponsor a cleanup", "$500", "Tools, bags, vests, water and waste pickup for a 40-volunteer event, with your logo on the project sign."],
  ["Neighborhood partner", "$5,000", "Funds a season of projects in one high-need neighborhood and a named spot on the impact report."],
];
const links = [
  ["Keep Houston Beautiful", "https://www.houstonbeautiful.org/", "Program home, Greenlight Days, donations"],
  ["Houston 311", "https://www.houstontx.gov/311/", "Report illegal dumping, litter, drainage"],
  ["Volunteer Houston", "https://www.volunteerhouston.org/", "Citywide volunteer listings"],
  ["Houston Community ToolBank", "https://houston.toolbank.org/", "Tool lending for community projects"],
  ["Texas Litter Database", "https://www.texaslitterdatabase.com/", "Statewide litter data reporting"],
  ["Trees For Houston", "https://www.treesforhouston.org/", "Native tree stock and planting guidance"],
];

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <PageHeader title="Partners & sponsors" lede="The platform runs on volunteer time, borrowed tools and sponsor dollars. Every dollar is tied to a project record, so sponsors see exactly what it did." />
      {sp.thanks && <div className="mb-4"><Notice tone="success"><b>Thanks.</b> “{sp.thanks}” would go to checkout here; in this prototype nothing is charged. Sponsors get a link to the exact project record their money funded.</Notice></div>}
      <div className="grid gap-3 sm:grid-cols-3">
        {tiers.map(([t, amt, d]) => (
          <div key={t} className="card p-4 grid gap-2 content-start">
            <div className="font-semibold">{t}</div>
            <div className="text-3xl font-extrabold leading-none tabular-nums">{amt}</div>
            <p className="text-sm text-ink-soft">{d}</p>
            <a href={`/partners?thanks=${encodeURIComponent(t + " (" + amt + ")")}`} className="btn-primary">Sponsor this</a>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold">Partner with KHB</h2>
          <p className="text-sm text-ink-soft mt-1 mb-3 max-w-prose">Corporate volunteer days, in-kind tools and waste hauling, or data partnerships (canopy, heat, 311). Reach the partnerships team:</p>
          <div className="card p-4"><Dl items={[["Email", "partners@keephoustonbeautiful.example"], ["Phone", "(713) 555-0188 · Mon–Fri 9–5"], ["Mail", "Keep Houston Beautiful, PO Box 0000, Houston, TX 77002 (sample)"]]} /></div>
        </section>
        <section>
          <h2 className="text-xl font-bold">The systems this platform connects</h2>
          <p className="text-sm text-ink-soft mt-1 mb-3 max-w-prose">We don&apos;t replace these. The front door routes people to the right one and keeps the record in one place.</p>
          <div className="card divide-y divide-line">
            {links.map(([n, u, d]) => (
              <a key={u} href={u} target="_blank" rel="noopener" className="block px-4 py-3 hover:bg-ground"><div className="font-semibold">{n} <span className="text-ink-soft font-normal">↗</span></div><div className="text-sm text-ink-soft">{d}</div></a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
