import Link from "next/link";
import type { Project, ProjectStatus } from "@/db/schema";
import { PROJECT_TYPE_EMOJI, PROJECT_TYPE_LABEL, STATUS_LABEL, STATUS_STYLE } from "@/lib/constants";

export function StatusChip({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function TypeChip({ type }: { type: Project["type"] }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
      <span aria-hidden>{PROJECT_TYPE_EMOJI[type]}</span>
      {PROJECT_TYPE_LABEL[type]}
    </span>
  );
}

export function HighNeed({ small }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-vest-wash text-[#9a3f0a] ring-1 ring-inset ring-vest/40 font-medium ${small ? "px-1.5 py-0 text-[11px]" : "px-2 py-0.5 text-xs"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-vest" aria-hidden />
      High-need area
    </span>
  );
}

export function fmtDate(d: Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!d) return "Date TBD";
  return d.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Chicago", ...opts,
  });
}

export function fmtDay(d: Date | null | undefined) {
  if (!d) return "Date TBD";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}

export function ProjectRow({
  p, neighborhood, signupCount, href,
}: { p: Project; neighborhood?: string | null; signupCount?: number; href?: string }) {
  return (
    <Link
      href={href ?? `/projects/${p.id}`}
      className="card block p-4 hover:border-ink/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5" aria-hidden>{PROJECT_TYPE_EMOJI[p.type]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-tight">{p.title}</h3>
            {p.priorityFlag && <HighNeed small />}
          </div>
          <p className="text-sm text-ink-soft mt-1">
            {neighborhood ? `${neighborhood} · ` : ""}{fmtDate(p.eventDate)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            <span>{PROJECT_TYPE_LABEL[p.type]}</span>
            {p.volunteerEstimate ? (
              <span>{signupCount ?? 0}/{p.volunteerEstimate} volunteers</span>
            ) : null}
            {p.adoptedByOrg && <span>Led by {p.adoptedByOrg}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PageHeader({ title, lede, children }: { title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
      {lede && <p className="mt-2 text-ink-soft max-w-prose">{lede}</p>}
      {children}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warn"; children: React.ReactNode }) {
  const cls = {
    info: "bg-water/40 border-water text-ink",
    success: "bg-green-wash border-green/30 text-green-deep",
    warn: "bg-vest-wash border-vest/40 text-[#7a3208]",
  }[tone];
  return <div className={`rounded-sm border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function Dl({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-soft">{k}</dt>
          <dd className="min-w-0 break-words">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
