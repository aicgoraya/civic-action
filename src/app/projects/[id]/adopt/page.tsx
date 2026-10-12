import Link from "next/link";
import { notFound } from "next/navigation";
import { publicProject } from "@/lib/queries";
import { AdoptForm } from "@/components/forms/SmallForms";
import { fmtDate, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdoptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await publicProject(id);
  if (!p) notFound();
  const open = ["APPROVED", "PUBLISHED"].includes(p.status) && !p.adoptedByOrg;
  return (
    <div className="mx-auto max-w-xl px-4 pt-6">
      <Link href={`/projects/${id}`} className="text-sm text-ink-soft hover:text-ink">← {p.title}</Link>
      <h1 className="mt-3 text-2xl font-bold">Lead this project as a group</h1>
      <p className="text-ink-soft mt-1">{fmtDate(p.eventDate)} · {p.address}</p>
      <p className="mt-3 text-sm max-w-prose">Your group takes responsibility for the day: recruiting and checking in volunteers, picking up tools from the ToolBank, running the safety briefing and reporting results. KHB stays the approver and handles waste pickup.</p>
      <div className="mt-6 card p-5">
        {open ? <AdoptForm projectId={p.id} /> : <Notice tone="warn">This project {p.adoptedByOrg ? `is already led by ${p.adoptedByOrg}` : "isn't open for adoption"}.</Notice>}
      </div>
    </div>
  );
}
