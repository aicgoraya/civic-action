"use client";

import { useFormStatus } from "react-dom";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function SubmitButton({ children, className = "btn-primary", pendingText = "Saving…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function ErrorBox({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-sm border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      {error}
    </div>
  );
}

type Common = { label: string; name: string; hint?: string };
type InputProps = Common & { as?: "input" } & InputHTMLAttributes<HTMLInputElement>;
type AreaProps = Common & { as: "textarea" } & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Field(props: InputProps | AreaProps) {
  const { label, name, hint } = props;
  const id = `f-${name}`;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {props.as === "textarea" ? (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (({ as, label, hint, ...rest }) => <textarea id={id} className="field" {...rest} />)(props)
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (({ as, label, hint, ...rest }) => <input id={id} className="field" {...rest} />)(props)
      )}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Checkbox({ name, label, defaultChecked, required }: { name: string; label: React.ReactNode; defaultChecked?: boolean; required?: boolean }) {
  return (
    <label className="flex items-start gap-3 text-sm cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} required={required} className="mt-1 h-4 w-4 accent-green" />
      <span>{label}</span>
    </label>
  );
}
