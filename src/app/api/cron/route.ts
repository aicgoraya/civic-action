import { NextResponse } from "next/server";
import { runEventReminders, runTreeCheckpoints } from "@/lib/automations";

// Vercel Cron hits this daily (see vercel.json). It only sends reminders
// and checkpoint notices — it never changes a project's status.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const reminders = await runEventReminders();
  const checkpoints = await runTreeCheckpoints();
  return NextResponse.json({ ok: true, reminders, checkpoints, at: new Date().toISOString() });
}
