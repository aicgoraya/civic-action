import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { adminLogout } from "@/lib/actions/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  if (!admin) return <>{children}</>;
  const tabs = [
    ["/admin", "Review queue"],
    ["/admin/stewardship", "Tree stewardship"],
    ["/admin/tags", "Tags"],
    ["/admin/outbox", "Outbox"],
  ];
  return (
    <div>
      <div className="bg-ink text-white">
        <div className="mx-auto max-w-5xl px-4 h-11 flex items-center gap-1 text-sm overflow-x-auto">
          <span className="font-semibold mr-3 shrink-0">KHB staff</span>
          {tabs.map(([href, label]) => (
            <Link key={href} href={href} className="px-2.5 py-1.5 rounded-sm hover:bg-white/10 whitespace-nowrap">{label}</Link>
          ))}
          <form action={adminLogout} className="ml-auto shrink-0"><button className="px-2.5 py-1.5 rounded-sm hover:bg-white/10 text-white/70">Sign out</button></form>
        </div>
      </div>
      {children}
    </div>
  );
}
