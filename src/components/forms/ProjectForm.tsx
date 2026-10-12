"use client";

import { useActionState, useState } from "react";
import { submitProject, type FormState } from "@/lib/actions/public";
import { LocationPicker } from "@/components/MapClient";
import { PROJECT_TYPE_LABEL } from "@/lib/constants";
import { SubmitButton, ErrorBox, Field } from "./bits";

export function ProjectForm({ kind }: { kind: "PARTNER" | "COMMUNITY_GROUP" }) {
  const [state, action] = useActionState<FormState, FormData>(submitProject, undefined);
  const f = state?.fields ?? {};
  const [type, setType] = useState(f.type ?? "CLEANUP");
  const partner = kind === "PARTNER";

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="kind" value={kind} />
      <ErrorBox error={state?.error} />

      <fieldset className="space-y-4">
        <legend className="text-lg font-bold mb-1">The site</legend>
        <Field label="Project title" name="title" defaultValue={f.title} placeholder="e.g. Hillcroft corridor cleanup" required />
        <div>
          <label className="label" htmlFor="type">Type of work</label>
          <select id="type" name="type" className="field" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(PROJECT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {type === "TREE_PLANTING" && <p className="hint">Tree projects need a named steward who accepts one year of watering and monitoring. KHB won&apos;t publish without it.</p>}
        </div>
        <Field label="Address or cross-streets" name="address" defaultValue={f.address} placeholder="5900 Hillcroft Ave, 77036" required />
        <div>
          <span className="label">Pin the site on the map</span>
          <LocationPicker initial={f.lat && f.lng ? [Number(f.lat), Number(f.lng)] : null} />
        </div>
        <Field as="textarea" rows={5} label="What needs doing, and why here?" name="description" defaultValue={f.description} required
          placeholder="Describe the site, what you've seen (dumping, litter, bare lot), who's affected, and what a volunteer day would do." />
        <Field label={partner ? "Who owns the site, and do you have permission?" : "Do you know who owns the site?"} name="siteOwnerNote" defaultValue={f.siteOwnerNote}
          placeholder={partner ? "City ROW; apartment manager letter on file" : "Not sure — looks like a city lot"} hint="KHB confirms ownership and permission before approving. It's fine to say you don't know." />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-bold mb-1">{partner ? "Your organization" : "Your group"}</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Your name" name="submitterName" defaultValue={f.submitterName} required autoComplete="name" />
          <Field label={partner ? "Organization" : "Group or organization"} name="submitterOrg" defaultValue={f.submitterOrg} required autoComplete="organization" />
          <Field label="Email" name="submitterEmail" type="email" defaultValue={f.submitterEmail} required autoComplete="email" />
          <Field label="Phone (optional)" name="submitterPhone" type="tel" defaultValue={f.submitterPhone} autoComplete="tel" />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-bold mb-1">Logistics <span className="text-ink-soft font-normal text-sm">(fill what you know; KHB adds the rest)</span></legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Proposed date & time" name="eventDate" type="datetime-local" defaultValue={f.eventDate} />
          <Field label="Volunteers you expect" name="volunteerEstimate" type="number" min={0} defaultValue={f.volunteerEstimate} />
        </div>
        {type === "TREE_PLANTING" && (
          <div className="grid sm:grid-cols-3 gap-4 rounded-sm border border-green/30 bg-green-wash p-4">
            <Field label="Number of trees" name="treeCount" type="number" min={1} max={50} defaultValue={f.treeCount ?? "1"} />
            <Field label="Steward name" name="stewardName" defaultValue={f.stewardName} required />
            <Field label="Steward email" name="stewardEmail" type="email" defaultValue={f.stewardEmail} required />
          </div>
        )}
        <Field label="Tools you'll need" name="toolsNeeded" defaultValue={f.toolsNeeded} placeholder="20 grabbers, 40 bags, 5 rakes" hint="KHB can reserve these through the Houston Community ToolBank." />
        <Field label="Waste handling plan" name="wasteHandling" defaultValue={f.wasteHandling} placeholder="Who hauls the bags? Bulk items? Tires?" />
        <Field as="textarea" rows={3} label="Safety concerns at the site" name="safetyNotes" defaultValue={f.safetyNotes} placeholder="Traffic, sharps, water, heat exposure…" />
        <Field label="Related records" name="externalRefs" defaultValue={f.externalRefs} placeholder="311 service request #, Volunteer Houston link…" />
      </fieldset>

      <div className="flex items-center gap-4">
        <SubmitButton>{partner ? "Submit for KHB review" : "Send proposal to KHB"}</SubmitButton>
        <p className="text-xs text-ink-soft max-w-[28ch]">Nothing is published until a KHB reviewer approves it.</p>
      </div>
    </form>
  );
}
