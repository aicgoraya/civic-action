import Link from "next/link";
import { isAdmin } from "@/lib/auth";

export async function Nav() {
  const admin = await isAdmin();
  return (
    <header className="bg-paper border-b border-line sticky top-0 z-[1000]">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-ink shrink-0">
          <span className="inline-block h-6 w-6 rounded-sm bg-green relative overflow-hidden" aria-hidden>
            <span className="absolute inset-x-0 bottom-0 h-2 bg-vest" />
          </span>
          <span className="hidden sm:inline">Houston Civic Action</span>
          <span className="sm:hidden">Civic Action</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm ml-auto">
          <Link href="/projects" className="px-2.5 py-1.5 rounded-sm hover:bg-ink/5">Projects</Link>
          <Link href="/impact" className="px-2.5 py-1.5 rounded-sm hover:bg-ink/5">Impact</Link>
          {admin ? (
            <Link href="/admin" className="px-2.5 py-1.5 rounded-sm bg-ink text-white font-medium">
              KHB review
            </Link>
          ) : (
            <Link href="/admin/login" className="px-2.5 py-1.5 rounded-sm text-ink-soft hover:bg-ink/5">
              Staff
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
