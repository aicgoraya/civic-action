import { NextResponse } from "next/server";
import { houReply } from "@/lib/hou";

export async function POST(req: Request) {
  const { q } = await req.json().catch(() => ({ q: "" }));
  if (typeof q !== "string" || !q.trim()) return NextResponse.json({ text: "Say something and I'll do my best." });
  const r = await houReply(q.slice(0, 500));
  return NextResponse.json(r);
}
