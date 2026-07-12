import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock4,
  Cpu,
  Radio,
  Server,
  Target,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

const HEARTBEAT_BASE_HZ = 1;

export default function TelemetrySidebar() {
  const { state } = useApp();
  const { telemetry, connectionStatus, serverTime } = state;

  const [heartbeat, setHeartbeat] = useState(0);
  const [heartbeatTrend, setHeartbeatTrend] = useState<"up" | "down" | "flat">(
    "flat",
  );
  const [vertSpeed, setVertSpeed] = useState(0);
  const [vertSpeedTrend, setVertSpeedTrend] = useState<"up" | "down" | "flat">(
    "flat",
  );

  const prevAltRef = useRef(telemetry.irtifa);
  const prevHeartbeatRef = useRef(0);
  const prevVspeedRef = useRef(0);

  useEffect(() => {
    const nextHeartbeat = connectionStatus.mavlink
      ? +(HEARTBEAT_BASE_HZ + (Math.random() - 0.5) * 0.08).toFixed(2)
      : 0;

    const heartbeatDelta = nextHeartbeat - prevHeartbeatRef.current;
    setHeartbeat(nextHeartbeat);
    setHeartbeatTrend(
      heartbeatDelta > 0.02 ? "up" : heartbeatDelta < -0.02 ? "down" : "flat",
    );
    prevHeartbeatRef.current = nextHeartbeat;

    const nextVspeed = +(telemetry.irtifa - prevAltRef.current).toFixed(2);
    const vspeedDelta = nextVspeed - prevVspeedRef.current;
    setVertSpeed(nextVspeed);
    setVertSpeedTrend(
      vspeedDelta > 0.05 ? "up" : vspeedDelta < -0.05 ? "down" : "flat",
    );
    prevVspeedRef.current = nextVspeed;
    prevAltRef.current = telemetry.irtifa;
  }, [telemetry.irtifa, connectionStatus.mavlink]);

  const serverTimeLabel = serverTime
    ? `${String(serverTime.saat).padStart(2, "0")}:${String(serverTime.dakika).padStart(2, "0")}:${String(serverTime.saniye).padStart(2, "0")}.${String(serverTime.milisaniye).padStart(3, "0")}`
    : "--:--:--.---";

  return (
    <aside className="flex h-full flex-col gap-3 overflow-y-auto pr-0.5">
      <SectionLabel label="COMPETITION PANEL" />

      <div className="rounded-lg border border-border bg-gcs-surface p-3">
        <SectionLabel label="LINK STATUS" small />
        <div className="mt-2 flex flex-col gap-2">
          <StatusLedRow
            icon={<Radio size={11} />}
            label="MAVLINK BRIDGE"
            active={connectionStatus.mavlink}
          />
          <StatusLedRow
            icon={<Cpu size={11} />}
            label="RPI LINK"
            active={connectionStatus.rpi}
          />
          <StatusLedRow
            icon={<Server size={11} />}
            label="COMP SERVER"
            active={connectionStatus.server}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-gcs-surface p-3">
        <SectionLabel label="LIVE VALUES" small />
        <div className="mt-2 flex flex-col gap-2">
          <TrendMetric
            icon={<Activity size={12} />}
            label="HEARTBEAT"
            value={`${heartbeat.toFixed(2)} Hz`}
            trend={heartbeatTrend}
            tone="teal"
          />
          <TrendMetric
            icon={<Activity size={12} />}
            label="VERT SPEED"
            value={`${vertSpeed.toFixed(2)} m/s`}
            trend={vertSpeedTrend}
            tone="orange"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-gcs-surface p-3">
        <SectionLabel label="UAV DATA" small />
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
          <TelRow label="ALT" value={`${telemetry.irtifa.toFixed(1)} m`} />
          <TelRow label="SPD" value={`${telemetry.hiz.toFixed(1)} m/s`} />
          <TelRow label="PITCH" value={`${telemetry.dikilme.toFixed(1)} deg`} />
          <TelRow label="ROLL" value={`${telemetry.yatis.toFixed(1)} deg`} />
          <TelRow label="HDG" value={`${telemetry.yonelme.toFixed(0)} deg`} />
          <TelRow label="MODE" value={telemetry.otonom ? "AUTO" : "MANUAL"} />
        </div>

        <div className="mt-3 border-t border-border pt-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              TARGET LOCK
            </span>
            <span
              className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold"
              style={{
                color: telemetry.kilitlenme
                  ? "#FF0000"
                  : "var(--muted-foreground)",
                borderColor: telemetry.kilitlenme ? "#FF0000" : "var(--border)",
                backgroundColor: telemetry.kilitlenme
                  ? "rgba(255,0,0,0.09)"
                  : "transparent",
              }}
            >
              {telemetry.kilitlenme ? "LOCKED" : "SEARCH"}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              <Clock4 size={10} />
              SERVER TIME
            </span>
            <span
              className="font-mono text-[10px] tabular-nums"
              style={{ color: "var(--gcs-teal-dim)" }}
            >
              {serverTimeLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-gcs-surface p-3">
        <SectionLabel label="MISSION COMMANDS" small />
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            className="rounded-lg border px-3 py-3 font-mono text-[12px] font-bold uppercase  transition-colors cursor-pointer"
            style={{
              color: "#FF5A5A",
              borderColor: "#FF3B3B",
              backgroundColor: "rgba(255,59,59,0.10)",
            }}
            onClick={() => {
              console.warn("[SAFETY] ABORT MISSION command requested");
            }}
          >
            ABORT MISSION
          </button>

          <button
            className="rounded-lg border px-3 py-3 font-mono text-[12px] font-bold uppercase transition-colors cursor-pointer"
            style={{
              color: "var(--gcs-orange)",
              borderColor: "oklch(0.68 0.22 45 / 0.5)",
              backgroundColor: "oklch(0.68 0.22 45 / 0.11)",
            }}
            onClick={() => {
              console.warn("[SAFETY] RTL command requested");
            }}
          >
            RTL
          </button>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ label, small }: { label: string; small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-px flex-1"
        style={{ backgroundColor: "oklch(0.75 0.18 192 / 0.3)" }}
      />
      <span
        className={`whitespace-nowrap font-mono uppercase tracking-widest ${small ? "text-[9px] text-muted-foreground" : "text-[10px]"}`}
        style={small ? {} : { color: "var(--gcs-teal)" }}
      >
        {label}
      </span>
      <div
        className="h-px flex-1"
        style={{ backgroundColor: "oklch(0.75 0.18 192 / 0.3)" }}
      />
    </div>
  );
}

function StatusLedRow({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between rounded border px-2.5 py-1.5"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--gcs-surface-2)",
      }}
    >
      <span className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground">
        <span
          style={{
            color: active ? "var(--gcs-teal)" : "var(--muted-foreground)",
          }}
        >
          {icon}
        </span>
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: active ? "var(--gcs-green)" : "var(--gcs-red)",
            boxShadow: active
              ? "0 0 6px var(--gcs-green)"
              : "0 0 5px var(--gcs-red)",
          }}
        />
        <span
          className="font-mono text-[10px]"
          style={{ color: active ? "var(--gcs-green)" : "var(--gcs-red)" }}
        >
          {active ? "OK" : "OFF"}
        </span>
      </span>
    </div>
  );
}

function TrendMetric({
  icon,
  label,
  value,
  trend,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: "up" | "down" | "flat";
  tone: "teal" | "orange";
}) {
  const baseColor = tone === "teal" ? "var(--gcs-teal)" : "var(--gcs-orange)";
  const trendColor =
    trend === "up"
      ? "var(--gcs-green)"
      : trend === "down"
        ? "var(--gcs-red)"
        : "var(--muted-foreground)";

  return (
    <div
      className="flex items-center justify-between rounded border px-2.5 py-2"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--gcs-surface-2)",
      }}
    >
      <span className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground">
        <span style={{ color: baseColor }}>{icon}</span>
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span
          className="font-mono text-[11px] tabular-nums"
          style={{ color: baseColor }}
        >
          {value}
        </span>
        {trend === "up" && (
          <ArrowUpRight size={12} style={{ color: trendColor }} />
        )}
        {trend === "down" && (
          <ArrowDownRight size={12} style={{ color: trendColor }} />
        )}
        {trend === "flat" && <Target size={11} style={{ color: trendColor }} />}
      </span>
    </div>
  );
}

function TelRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className="text-right font-mono text-[10px] tabular-nums"
        style={{ color: "var(--gcs-teal)" }}
      >
        {value}
      </span>
    </>
  );
}
