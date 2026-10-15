"use server";
import { redirect } from "next/navigation";
import { db, subscribers, neighborhoods } from "@/db";
import { eq } from "drizzle-orm";
import { notify } from "@/lib/automations";
import type { FormState } from "./public";

export async function subscribe(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim(), email = String(fd.get("email") ?? "").trim(), phone = String(fd.get("phone") ?? "").trim() || null, nbId = String(fd.get("neighborhoodId") ?? "") || null;
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Name and a valid email are required.", fields: { name, email, phone: phone ?? "", neighborhoodId: nbId ?? "" } };
  await db.insert(subscribers).values({ name, email, phone, neighborhoodId: nbId }).onConflictDoUpdate({ target: subscribers.email, set: { name, phone, neighborhoodId: nbId } });
  const nb = nbId ? await db.query.neighborhoods.findFirst({ where: eq(neighborhoods.id, nbId) }) : null;
  await notify("SIGNUP_CONFIRMATION", email, "You're on the list", `Hi ${name}, you'll get one email a month${phone ? " and a text the day before events you join" : ""}${nb ? ` for ${nb.name}` : ""}.`);
  redirect(`/updates?ok=${encodeURIComponent(email)}`);
}
