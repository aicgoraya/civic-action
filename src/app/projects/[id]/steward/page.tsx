import Link from "next/link";
import { notFound } from "next/navigation";
import { publicProject } from "@/lib/queries";
import { StewardForm } from "@/components/forms/SmallForms";
import { Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StewardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await publicProject(id);
  if (!p || p.type !== "TREE_PLANTING") notFound();
  const pendingMap = new Map<string, { name: string; email: string; count: number }>();
  for (const t of p.trees) {
    if (t.commitmentAcceptedAt) continue;
    const k = t.stewardEmail.toLowerCase();
    const e = pendingMap.get(k) ?? { name: t.stewardName, email: t.stewardEmail, count: 0 };
    e.count++;
    pendingMap.set(k, e);
  }
  const pending = [...pendingMap.values()];
  return (
    <div className="mx-auto max-w-xl px-4 pt-6">
      <Link href={`/projects/${id}`} className="text-sm text-ink-soft hover:text-ink">← {p.title}</Link>
      <h1 className="mt-3 text-2xl font-bold">Tree stewardship commitment</h1>
      <p className="text-ink-soft mt-1">{p.address}</p>
      <div className="mt-6 card p-5">
        {pending.length ? <StewardForm projectId={p.id} pending={pending} /> : <Notice tone="success">Every steward on this project has accepted their commitment.</Notice>}
      </div>
    </div>
  );
}
