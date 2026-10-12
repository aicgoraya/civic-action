import type { ProjectStatus, ProjectType } from "@/db/schema";

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  CLEANUP: "Cleanup",
  TREE_PLANTING: "Tree planting",
  BEAUTIFICATION: "Beautification",
  ILLEGAL_DUMPING: "Dumping remediation",
};

export const PROJECT_TYPE_EMOJI: Record<ProjectType, string> = {
  CLEANUP: "🧤",
  TREE_PLANTING: "🌳",
  BEAUTIFICATION: "🎨",
  ILLEGAL_DUMPING: "🚛",
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  SUBMITTED: "Awaiting review",
  NEEDS_INFO: "Needs info",
  APPROVED: "Approved · unpublished",
  PUBLISHED: "Published",
  COMPLETED: "Completed",
  DECLINED: "Declined",
};

// Tailwind classes for status chips
export const STATUS_STYLE: Record<ProjectStatus, string> = {
  SUBMITTED: "bg-amber-100 text-amber-900 ring-amber-200",
  NEEDS_INFO: "bg-orange-100 text-orange-900 ring-orange-200",
  APPROVED: "bg-sky-100 text-sky-900 ring-sky-200",
  PUBLISHED: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  COMPLETED: "bg-stone-200 text-stone-800 ring-stone-300",
  DECLINED: "bg-rose-100 text-rose-900 ring-rose-200",
};

export const KHB_REVIEW_EMAIL = "projects@keephoustonbeautiful.example";
export const TREE_COMMITMENT_DAYS = 365;
export const HIGH_NEED_THRESHOLD = 65; // needScore ≥ this → priority flag

export function appUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
