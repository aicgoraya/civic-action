import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 pt-16 text-center">
      <h1 className="text-2xl font-bold">Nothing here</h1>
      <p className="text-ink-soft mt-2">That project, tree or tag doesn&apos;t exist, or the link was mistyped.</p>
      <Link href="/" className="btn-primary mt-6">Back to the front door</Link>
    </div>
  );
}
