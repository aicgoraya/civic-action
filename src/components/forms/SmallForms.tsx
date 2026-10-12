"use client";

import { useActionState } from "react";
import { joinProject, adoptProject, tagCheckIn, acceptStewardship, type FormState } from "@/lib/actions/public";
import { SubmitButton, ErrorBox, Field, Checkbox } from "./bits";

export function JoinForm({ projectId, safetyNotes }: { projectId: string; safetyNotes?: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(joinProject, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <ErrorBox error={state?.error} />
      <Field label="Your name" name="name" defaultValue={f.name} required autoComplete="name" />
      <Field label="Email" name="email" type="email" defaultValue={f.email} required autoComplete="email" hint="For the reminder 48 hours before, and the day-of check-in." />
      <Field label="Phone (optional)" name="phone" type="tel" defaultValue={f.phone} autoComplete="tel" />
      {safetyNotes && (
        <div className="rounded-sm bg-vest-wash border border-vest/40 px-4 py-3 text-sm">
          <div className="font-semibold">Safety at this site</div>
          <p className="mt-1 whitespace-pre-line">{safetyNotes}</p>
        </div>
      )}
      <Checkbox name="waiver" required label={<>I&apos;ve read the safety notes and accept the <span className="underline">volunteer waiver</span> (mock). I&apos;m 18+ or accompanied by a guardian.</>} />
      <SubmitButton pendingText="Signing you up…">Sign up</SubmitButton>
    </form>
  );
}

export function AdoptForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState<FormState, FormData>(adoptProject, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <ErrorBox error={state?.error} />
      <Field label="Group or organization" name="orgName" defaultValue={f.orgName} required autoComplete="organization" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Contact name" name="contactName" defaultValue={f.contactName} required autoComplete="name" />
        <Field label="Contact email" name="contactEmail" type="email" defaultValue={f.contactEmail} required autoComplete="email" />
        <Field label="Phone (optional)" name="contactPhone" type="tel" defaultValue={f.contactPhone} />
        <Field label="How many people can you bring?" name="groupSize" type="number" min={1} defaultValue={f.groupSize} required />
      </div>
      <Field as="textarea" rows={3} label="Anything KHB should know?" name="message" defaultValue={f.message} placeholder="Experience with cleanups, equipment you have, dates that work…" />
      <SubmitButton pendingText="Sending…">Request to lead this project</SubmitButton>
    </form>
  );
}

export function CheckInForm({ code, kind, label, placeholder }: { code: string; kind: "VOLUNTEER_CHECKIN" | "TREE_WATERING" | "ISSUE_REPORT"; label: string; placeholder?: string }) {
  const [state, action] = useActionState<FormState, FormData>(tagCheckIn, undefined);
  const f = state?.fields ?? {};
  const isIssue = kind === "ISSUE_REPORT";
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="kind" value={kind} />
      <ErrorBox error={state?.error} />
      <Field label="Your name" name="name" defaultValue={f.name} required autoComplete="name" />
      <Field as="textarea" rows={2} label={isIssue ? "What's wrong?" : "Note (optional)"} name="note" defaultValue={f.note} required={isIssue} placeholder={placeholder} />
      <SubmitButton className={isIssue ? "btn-danger w-full" : "btn-primary w-full"} pendingText="Logging…">{label}</SubmitButton>
    </form>
  );
}

export function StewardForm({ projectId, pending }: { projectId: string; pending: { name: string; email: string; count: number }[] }) {
  const [state, action] = useActionState<FormState, FormData>(acceptStewardship, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <ErrorBox error={state?.error} />
      <div>
        <label className="label" htmlFor="email">Your email (as given on the project)</label>
        <select id="email" name="email" className="field">
          {pending.map((s) => <option key={s.email} value={s.email}>{s.name} — {s.email} ({s.count} tree{s.count === 1 ? "" : "s"})</option>)}
        </select>
      </div>
      <div className="rounded-sm border border-line bg-paper p-4 text-sm space-y-2">
        <p className="font-semibold">The commitment</p>
        <ul className="list-disc pl-5 space-y-1 text-ink-soft">
          <li>Water each tree at least weekly for <strong className="text-ink">12 months</strong> from planting (more in summer).</li>
          <li>Tap the tag on the stake each time so KHB can see the tree is being cared for.</li>
          <li>Report damage, disease or a dead tree through the tag so it can be replaced.</li>
        </ul>
      </div>
      <Checkbox name="pledge" required label="I accept the one-year watering and monitoring commitment for these trees." />
      <SubmitButton className="btn-vest" pendingText="Recording…">Accept stewardship</SubmitButton>
    </form>
  );
}
