import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { publicProject } from "@/lib/queries";
import { JoinForm } from "@/components/forms/SmallForms";
import { fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await publicProject(id);
  if (!p) notFound();
  if (p.status !== "PUBLISHED") redirect(`/projects/${id}`);
  return (
    <div className="mx-auto max-w-xl px-4 pt-6">
      <Link href={`/projects/${id}`} className="text-sm text-ink-soft hover:text-ink">← {p.title}</Link>
      <h1 className="mt-3 text-2xl font-bold">Join as a volunteer</h1>
      <p className="text-ink-soft mt-1">{fmtDate(p.eventDate)} · {p.address}</p>
      <div className="mt-6 card p-5">
        <JoinForm projectId={p.id} safetyNotes={p.safetyNotes} />
      </div>
    </div>
  );
}
