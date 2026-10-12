"use client";

import { useActionState, useState } from "react";
import { adminLogin, saveDetails, requestInfo, declineProject, completeProject, addTree, createTag } from "@/lib/actions/admin";
import type { FormState } from "@/lib/actions/public";
import type { Project } from "@/db/schema";
import { SubmitButton, ErrorBox, Field, Checkbox } from "./bits";
import { LocationPicker } from "@/components/MapClient";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(adminLogin, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorBox error={state?.error} />
      <Field label="Password" name="password" type="password" required autoFocus />
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

function toLocalInput(d: Date | null) {
  if (!d) return "";
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 16);
}

export function DetailsForm({ p }: { p: Project }) {
  const [state, action] = useActionState<FormState, FormData>(saveDetails, undefined);
  const [open, setOpen] = useState(false);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={p.id} />
      <ErrorBox error={state?.error} />
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Event date & time" name="eventDate" type="datetime-local" defaultValue={toLocalInput(p.eventDate)} />
        <Field label="Duration (h)" name="durationHours" type="number" step="0.5" min={0} defaultValue={p.durationHours ?? ""} />
        <Field label="Volunteers needed" name="volunteerEstimate" type="number" min={0} defaultValue={p.volunteerEstimate ?? ""} />
      </div>
      <Field label="Site ownership / permission note" name="siteOwnerNote" defaultValue={p.siteOwnerNote ?? ""} placeholder="HCAD parcel, permit #, letter on file…" />
      <Field label="Tools (ToolBank order)" name="toolsNeeded" defaultValue={p.toolsNeeded ?? ""} />
      <Field label="Waste handling" name="wasteHandling" defaultValue={p.wasteHandling ?? ""} placeholder="SWMD pickup date, dumpster, tire recycler…" />
      <Field as="textarea" rows={3} label="Safety notes (shown to volunteers)" name="safetyNotes" defaultValue={p.safetyNotes ?? ""} />
      <Field label="Linked records (311, Volunteer Houston, ToolBank, TLD)" name="externalRefs" defaultValue={p.externalRefs ?? ""} />
      <Checkbox name="priorityFlag" defaultChecked={p.priorityFlag} label="Flag as high-need location (auto-set from neighborhood need score; override here)" />
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm text-green font-medium">
        {open ? "Hide map" : p.lat == null ? "Set map location" : "Move map pin"}
      </button>
      {open && <LocationPicker initial={p.lat != null && p.lng != null ? [p.lat, p.lng] : null} />}
      <SubmitButton className="btn-secondary">Save details</SubmitButton>
    </form>
  );
}

export function RequestInfoForm({ id, current }: { id: string; current?: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(requestInfo, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <ErrorBox error={state?.error} />
      <Field as="textarea" rows={3} label="What's missing? (sent to the submitter)" name="note" defaultValue={current ?? ""} placeholder="e.g. Please confirm HCFCD permission for the bayou bank and tell us who hauls the bags." />
      <SubmitButton className="btn-secondary" pendingText="Sending…">Request edits</SubmitButton>
    </form>
  );
}

export function DeclineForm({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(declineProject, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <ErrorBox error={state?.error} />
      <Field as="textarea" rows={2} label="Reason (sent to the submitter)" name="note" placeholder="Why this can't go ahead, and what would make it workable." />
      <SubmitButton className="btn-danger" pendingText="Declining…">Decline project</SubmitButton>
    </form>
  );
}

export function CompleteForm({ p }: { p: Project }) {
  const [state, action] = useActionState<FormState, FormData>(completeProject, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={p.id} />
      <ErrorBox error={state?.error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Volunteers" name="resultVolunteers" type="number" min={0} defaultValue={p.resultVolunteers ?? ""} />
        <Field label="Volunteer hours" name="resultHours" type="number" min={0} step="0.5" defaultValue={p.resultHours ?? ""} />
        <Field label="Waste removed (lb)" name="resultWasteLbs" type="number" min={0} defaultValue={p.resultWasteLbs ?? ""} />
        <Field label="Trees planted" name="resultTreesPlanted" type="number" min={0} defaultValue={p.resultTreesPlanted ?? ""} />
      </div>
      <SubmitButton className="btn-secondary">Mark completed & record results</SubmitButton>
    </form>
  );
}

export function AddTreeForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addTree, undefined);
  return (
    <form action={action} className="grid sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="sm:col-span-5"><ErrorBox error={state?.error} /></div>
      <Field label="Label" name="label" placeholder="Live Oak #9 — gate" required />
      <Field label="Species" name="species" placeholder="Live oak" />
      <Field label="Steward" name="stewardName" required />
      <Field label="Steward email" name="stewardEmail" type="email" required />
      <SubmitButton className="btn-secondary">Add tree</SubmitButton>
    </form>
  );
}

export function CreateTagForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState<FormState, FormData>(createTag, undefined);
  return (
    <form action={action} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="sm:col-span-3"><ErrorBox error={state?.error} /></div>
      <Field label="Tag code (printed on sticker)" name="code" placeholder="auto" />
      <Field label="Where it goes" name="label" placeholder="Yard sign at staging lot" />
      <SubmitButton className="btn-secondary">Create tag</SubmitButton>
    </form>
  );
}
