"use client";

import { useMemo } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useApp } from "@/context/AppContext";

type GeoPoint = {
  lat: number;
  lon: number;
};

type Bounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

const COMPETITION_BOUNDARY: GeoPoint[] = [
  { lat: 41.5142, lon: 36.1168 },
  { lat: 41.5142, lon: 36.1219 },
  { lat: 41.507, lon: 36.1219 },
  { lat: 41.507, lon: 36.1168 },
];

export default function MissionMap() {
  const { state } = useApp();
  const { telemetry, rivals, hssZones, connectionStatus } = state;

  const ownUav: GeoPoint = { lat: telemetry.enlem, lon: telemetry.boylam };

  const validRivals = rivals.filter(
    (rival) =>
      Number.isFinite(rival.iha_enlem) && Number.isFinite(rival.iha_boylam),
  );

  const bounds = useMemo(() => {
    const points: GeoPoint[] = [
      ...COMPETITION_BOUNDARY,
      ownUav,
      ...validRivals.map((rival) => ({
        lat: rival.iha_enlem,
        lon: rival.iha_boylam,
      })),
      ...hssZones.map((zone) => ({ lat: zone.hssEnlem, lon: zone.hssBoylam })),
    ];
    return computeBounds(points);
  }, [ownUav, validRivals, hssZones]);

  const boundaryPolyline = COMPETITION_BOUNDARY.map((point) => {
    const p = project(point, bounds);
    return `${p.x},${p.y}`;
  }).join(" ");

  const ownPixel = project(ownUav, bounds);

  const projectedRivals = validRivals.map((rival) => ({
    ...rival,
    ...project({ lat: rival.iha_enlem, lon: rival.iha_boylam }, bounds),
  }));

  const projectedHss = hssZones.map((zone) => {
    const center = project({ lat: zone.hssEnlem, lon: zone.hssBoylam }, bounds);
    const latDeg = metersToLatDegrees(zone.hssYaricap);
    const lonDeg = metersToLonDegrees(zone.hssYaricap, zone.hssEnlem);

    const radiusX = Math.abs(
      project({ lat: zone.hssEnlem, lon: zone.hssBoylam + lonDeg }, bounds).x -
        center.x,
    );
    const radiusY = Math.abs(
      project({ lat: zone.hssEnlem + latDeg, lon: zone.hssBoylam }, bounds).y -
        center.y,
    );

    return {
      ...zone,
      cx: center.x,
      cy: center.y,
      rx: Math.max(radiusX, 1.2),
      ry: Math.max(radiusY, 1.2),
    };
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="h-px w-6"
            style={{ backgroundColor: "oklch(0.75 0.18 192 / 0.5)" }}
          />
          <span
            className="truncate font-mono text-[10px] uppercase tracking-widest"
            style={{ color: "var(--gcs-teal)" }}
          >
            COMPLIANCE MISSION MAP
          </span>
          <div
            className="h-px flex-1"
            style={{ backgroundColor: "oklch(0.75 0.18 192 / 0.5)" }}
          />
        </div>

        <div className="flex items-center gap-2">
          <StatBadge
            label="RIVALS"
            value={String(projectedRivals.length)}
            tone="teal"
          />
          <StatBadge
            label="HSS"
            value={String(projectedHss.length)}
            tone="red"
          />
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg border"
        style={{
          borderColor: "oklch(0.75 0.18 192 / 0.3)",
          backgroundColor: "var(--gcs-surface)",
        }}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="comp-grid"
              width="44"
              height="44"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 44 0 L 0 0 0 44"
                fill="none"
                stroke="oklch(0.75 0.18 192 / 0.1)"
                strokeWidth="0.55"
              />
            </pattern>
            <radialGradient id="comp-bg" cx="50%" cy="50%">
              <stop offset="0%" stopColor="oklch(0.14 0.015 200)" />
              <stop offset="100%" stopColor="oklch(0.10 0.005 220)" />
            </radialGradient>
          </defs>

          <rect width="100%" height="100%" fill="url(#comp-bg)" />
          <rect width="100%" height="100%" fill="url(#comp-grid)" />

          <polygon
            points={boundaryPolyline}
            fill="none"
            stroke="#FF3B3B"
            strokeWidth="1.7"
            strokeDasharray="9 6"
            opacity="0.92"
          />

          {projectedHss.map((zone) => (
            <g key={zone.id}>
              <ellipse
                cx={`${zone.cx}%`}
                cy={`${zone.cy}%`}
                rx={`${zone.rx}%`}
                ry={`${zone.ry}%`}
                fill="rgba(255,59,59,0.10)"
                stroke="#FF3B3B"
                strokeWidth="1.4"
              />
              <text
                x={`${zone.cx}%`}
                y={`${Math.max(zone.cy - zone.ry - 1.2, 3)}%`}
                fill="#FF6A6A"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="middle"
              >
                HSS-{zone.id}
              </text>
            </g>
          ))}

          {projectedRivals.map((rival) => (
            <g key={rival.takim_numarasi}>
              <circle
                cx={`${rival.x}%`}
                cy={`${rival.y}%`}
                r="4"
                fill="oklch(0.75 0.18 192 / 0.25)"
                stroke="oklch(0.75 0.18 192)"
                strokeWidth="1"
              />
              <text
                x={`${rival.x + 1.4}%`}
                y={`${rival.y - 1.2}%`}
                fill="oklch(0.75 0.18 192 / 0.95)"
                fontSize="8"
                fontFamily="monospace"
              >
                R-{rival.takim_numarasi}
              </text>
            </g>
          ))}

          <g>
            <circle
              cx={`${ownPixel.x}%`}
              cy={`${ownPixel.y}%`}
              r="9"
              fill="oklch(0.68 0.22 45 / 0.12)"
              stroke="oklch(0.68 0.22 45 / 0.5)"
              strokeWidth="1.2"
              strokeDasharray="3 2"
            />
            <polygon
              points={`${ownPixel.x}%,${ownPixel.y - 1.85}% ${ownPixel.x - 1.18}%,${ownPixel.y + 0.9}% ${ownPixel.x + 1.18}%,${ownPixel.y + 0.9}%`}
              fill="oklch(0.68 0.22 45)"
            />
            <text
              x={`${ownPixel.x + 1.5}%`}
              y={`${ownPixel.y + 2.8}%`}
              fill="oklch(0.68 0.22 45)"
              fontSize="8"
              fontFamily="monospace"
            >
              OWN
            </text>
          </g>
        </svg>

        <div
          className="absolute left-2 top-2 rounded border px-2 py-1"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-center gap-2 text-[8px] font-mono uppercase tracking-widest text-muted-foreground">
            <LegendDot color="#FF3B3B" />
            BOUNDARY
            <LegendDot color="oklch(0.75 0.18 192)" />
            RIVALS
            <LegendDot color="#FF6A6A" />
            HSS
          </div>
        </div>

        {!connectionStatus.server && (
          <div
            className="absolute right-2 top-2 rounded border px-2 py-1"
            style={{
              borderColor: "oklch(0.68 0.22 45 / 0.4)",
              backgroundColor: "oklch(0.68 0.22 45 / 0.12)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={10} style={{ color: "var(--gcs-orange)" }} />
              <span
                className="font-mono text-[8px] uppercase tracking-widest"
                style={{ color: "var(--gcs-orange-dim)" }}
              >
                server offline
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ShieldAlert size={11} style={{ color: "var(--gcs-orange)" }} />
        <span
          className="font-mono text-[9px] uppercase tracking-widest"
          style={{ color: "var(--gcs-orange-dim)" }}
        >
          map layers are competition-critical: boundaries, rivals, and active
          no-fly hss zones.
        </span>
      </div>
    </div>
  );
}

function computeBounds(points: GeoPoint[]): Bounds {
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue;
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLon = Math.min(minLon, point.lon);
    maxLon = Math.max(maxLon, point.lon);
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(minLon)) {
    return {
      minLat: 41.507,
      maxLat: 41.5142,
      minLon: 36.1168,
      maxLon: 36.1219,
    };
  }

  const latRange = Math.max(maxLat - minLat, 0.0008);
  const lonRange = Math.max(maxLon - minLon, 0.0008);
  const latPad = latRange * 0.08;
  const lonPad = lonRange * 0.08;

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLon: minLon - lonPad,
    maxLon: maxLon + lonPad,
  };
}

function project(point: GeoPoint, bounds: Bounds): { x: number; y: number } {
  const x =
    ((point.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
  const y =
    100 - ((point.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
  };
}

function metersToLatDegrees(meters: number): number {
  return meters / 111_320;
}

function metersToLonDegrees(meters: number, atLat: number): number {
  const latRad = (atLat * Math.PI) / 180;
  const cosLat = Math.max(Math.cos(latRad), 0.1);
  return meters / (111_320 * cosLat);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function LegendDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function StatBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "teal" | "red";
}) {
  const style =
    tone === "red"
      ? {
          color: "#FF6A6A",
          borderColor: "rgba(255,59,59,0.5)",
          backgroundColor: "rgba(255,59,59,0.08)",
        }
      : {
          color: "var(--gcs-teal)",
          borderColor: "oklch(0.75 0.18 192 / 0.45)",
          backgroundColor: "oklch(0.75 0.18 192 / 0.08)",
        };

  return (
    <span
      className="rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
      style={style}
    >
      {label}: {value}
    </span>
  );
}
