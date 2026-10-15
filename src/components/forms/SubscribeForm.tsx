"use client";
import { useActionState } from "react";
import { subscribe } from "@/lib/actions/subscribe";
import type { FormState } from "@/lib/actions/public";
import { SubmitButton, ErrorBox, Field, Checkbox } from "./bits";

export function SubscribeForm({ neighborhoods, count }: { neighborhoods: { id: string; name: string }[]; count: number }) {
  const [state, action] = useActionState<FormState, FormData>(subscribe, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="space-y-4">
      <ErrorBox error={state?.error} />
      <Field label="Name" name="name" defaultValue={f.name} required autoComplete="name" />
      <Field label="Email" name="email" type="email" defaultValue={f.email} required autoComplete="email" />
      <Field label="Mobile for text reminders (optional)" name="phone" type="tel" defaultValue={f.phone} autoComplete="tel" hint="Msg & data rates may apply. Reply STOP to opt out. (mock)" />
      <div><label className="label" htmlFor="f-nb">Neighborhood</label><select id="f-nb" name="neighborhoodId" className="field" defaultValue={f.neighborhoodId ?? ""}><option value="">All of Houston</option>{neighborhoods.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></div>
      <Checkbox name="agree" required label="I'd like project updates from Keep Houston Beautiful. Unsubscribe any time." />
      <SubmitButton pendingText="Signing up…">Sign me up</SubmitButton>
      <p className="text-xs text-ink-soft">{count} neighbors subscribed</p>
    </form>
  );
}
