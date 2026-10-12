"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ProjectMap as PM, LocationPicker as LP } from "./ProjectMap";

const Skeleton = ({ h }: { h: number }) => (
  <div className="rounded-sm border border-line bg-water/30 animate-pulse" style={{ height: h }} />
);

const ProjectMapDyn = dynamic(() => import("./ProjectMap").then((m) => m.ProjectMap), {
  ssr: false,
  loading: () => <Skeleton h={420} />,
});
const LocationPickerDyn = dynamic(() => import("./ProjectMap").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <Skeleton h={260} />,
});

export function ProjectMap(props: ComponentProps<typeof PM>) {
  return <ProjectMapDyn {...props} />;
}
export function LocationPicker(props: ComponentProps<typeof LP>) {
  return <LocationPickerDyn {...props} />;
}
