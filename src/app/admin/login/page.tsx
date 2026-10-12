import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/forms/AdminForms";

export const metadata = { title: "Staff sign in" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto max-w-sm px-4 pt-12">
      <h1 className="text-2xl font-bold">Keep Houston Beautiful staff</h1>
      <p className="text-ink-soft text-sm mt-1">The review interface is separate from the public site. Only staff can approve or publish.</p>
      <div className="mt-6 card p-5"><LoginForm /></div>
      <p className="hint mt-3">Prototype: single shared password set in <code>ADMIN_PASSWORD</code>. Production would use KHB&apos;s Microsoft 365 sign-in.</p>
    </div>
  );
}
