"use client";

import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Tooltip, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";

export type MapMarker = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  type: string;
  status: string;
  priority: boolean;
  href: string;
  subtitle?: string;
};

export type MapNeighborhood = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  needScore: number;
  canopyPct: number;
  heatIndex: number;
};

const HOUSTON: [number, number] = [29.76, -95.4];

const TYPE_COLOR: Record<string, string> = {
  CLEANUP: "#1f6f4a",
  TREE_PLANTING: "#2e8b57",
  BEAUTIFICATION: "#3b6ea8",
  ILLEGAL_DUMPING: "#7a3f8f",
};

function needColor(score: number) {
  // low need → transparent-ish water blue, high need → safety orange
  if (score >= 75) return "#f26a1b";
  if (score >= 65) return "#f59e42";
  if (score >= 50) return "#f3c57b";
  return "#cfe3e8";
}

export function ProjectMap({
  markers,
  neighborhoods,
  height = 420,
  center,
  zoom = 10,
  showNeedDefault = true,
}: {
  markers: MapMarker[];
  neighborhoods: MapNeighborhood[];
  height?: number;
  center?: [number, number];
  zoom?: number;
  showNeedDefault?: boolean;
}) {
  const [showNeed, setShowNeed] = useState(showNeedDefault);
  return (
    <div className="relative">
      <MapContainer
        center={center ?? HOUSTON}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height, width: "100%" }}
        className="rounded-sm border border-line z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {showNeed &&
          neighborhoods.map((n) => (
            <Circle
              key={n.id}
              center={[n.lat, n.lng]}
              radius={900 + n.needScore * 14}
              pathOptions={{ color: needColor(n.needScore), fillColor: needColor(n.needScore), fillOpacity: 0.28, weight: 1 }}
            >
              <Tooltip direction="top" opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">{n.name}</div>
                  <div>Need score {Math.round(n.needScore)} · canopy {n.canopyPct}% · heat {n.heatIndex}</div>
                </div>
              </Tooltip>
            </Circle>
          ))}
        {markers.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={m.status === "COMPLETED" ? 7 : 9}
            pathOptions={{
              color: "#14211a",
              weight: 1.5,
              fillColor: m.status === "COMPLETED" ? "#9aa69e" : TYPE_COLOR[m.type] ?? "#1f6f4a",
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="text-sm min-w-[180px]">
                <div className="font-semibold leading-tight">{m.title}</div>
                {m.subtitle && <div className="text-ink-soft mt-0.5">{m.subtitle}</div>}
                {m.priority && <div className="text-[#9a3f0a] text-xs mt-1">High-need area</div>}
                <Link href={m.href} className="inline-block mt-2 font-medium text-green underline">
                  View project
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="absolute top-2 right-2 z-[500] flex gap-2">
        <label className="card px-2.5 py-1.5 text-xs flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={showNeed} onChange={(e) => setShowNeed(e.target.checked)} className="accent-vest" />
          High-need areas
        </label>
      </div>
      {showNeed && (
        <div className="absolute bottom-2 left-2 z-[500] card px-2.5 py-1.5 text-[11px] flex items-center gap-2">
          <span>Need</span>
          {[50, 65, 75, 90].map((s) => (
            <span key={s} className="inline-block h-3 w-5 rounded-[2px]" style={{ background: needColor(s), opacity: 0.8 }} />
          ))}
          <span>high</span>
        </div>
      )}
    </div>
  );
}

function Clicker({ onPick }: { onPick: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

// Click-to-place picker used in forms
export function LocationPicker({
  name = "",
  initial,
}: {
  name?: string;
  initial?: [number, number] | null;
}) {
  const [pos, setPos] = useState<[number, number] | null>(initial ?? null);
  return (
    <div>
      <MapContainer
        center={pos ?? HOUSTON}
        zoom={pos ? 14 : 10}
        scrollWheelZoom={false}
        style={{ height: 260, width: "100%" }}
        className="rounded-sm border border-line z-0"
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap &copy; CARTO" />
        <Clicker onPick={setPos} />
        {pos && <CircleMarker center={pos} radius={9} pathOptions={{ color: "#14211a", fillColor: "#f26a1b", fillOpacity: 1 }} />}
      </MapContainer>
      <input type="hidden" name={`${name}lat`} value={pos?.[0] ?? ""} />
      <input type="hidden" name={`${name}lng`} value={pos?.[1] ?? ""} />
      <p className="hint">
        {pos ? `Pinned at ${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}. Click again to move.` : "Tap the map to drop a pin on the site. KHB uses this to flag high-need areas."}
      </p>
    </div>
  );
}
