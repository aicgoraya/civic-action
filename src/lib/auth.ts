import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac } from "crypto";

const COOKIE = "khb_admin";

function token() {
  const secret = process.env.ADMIN_PASSWORD ?? "";
  return createHmac("sha256", "civic-action").update(secret).digest("hex");
}

export async function isAdmin() {
  const c = await cookies();
  return !!process.env.ADMIN_PASSWORD && c.get(COOKIE)?.value === token();
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function login(password: string) {
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return false;
  const c = await cookies();
  c.set(COOKIE, token(), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  return true;
}

export async function logout() {
  const c = await cookies();
  c.delete(COOKIE);
}
