import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { allTags } from "@/lib/queries";
import { appUrl } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tags" };

export default async function TagsPage() {
  await requireAdmin();
  const rows = await allTags();
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Physical tags</h1>
      <p className="text-ink-soft text-sm mt-1 max-w-prose">Each NFC sticker is written with a URL from this list (any phone can write one with a free NFC app; no app is needed to read it). Yard-sign tags check volunteers in; stake tags log tree watering. Create new tags from a project&apos;s review page.</p>
      <div className="mt-6 card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-ink-soft border-b border-line"><tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">URL to write on sticker</th><th className="px-3 py-2">Attached to</th><th className="px-3 py-2">Placement</th><th className="px-3 py-2 text-right">Taps</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                <td className="px-3 py-2 font-mono text-xs"><Link href={`/t/${t.code}`} className="hover:underline">{appUrl(`/t/${t.code}`)}</Link></td>
                <td className="px-3 py-2">{t.tree ? <>🌳 {t.tree.label}</> : t.project ? <Link href={`/admin/projects/${t.project.id}`} className="hover:underline">{t.project.title}</Link> : "—"}</td>
                <td className="px-3 py-2 text-ink-soft">{t.label}</td>
                <td className="px-3 py-2 text-right tabular-nums">{t.taps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
