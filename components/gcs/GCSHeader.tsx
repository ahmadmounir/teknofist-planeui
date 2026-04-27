"use client";

import { useEffect, useState } from "react";
import { Plane, Wifi, WifiOff, Shield, Clock } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function GCSHeader() {
  const { state } = useApp();
  const [utcTime, setUtcTime] = useState("");

  useEffect(() => {
    const update = () =>
      setUtcTime(new Date().toUTCString().split(" ").slice(4, 5)[0] + " UTC");
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const { telemetry, connectionStatus, teamNumber } = state;
  const allLinked = connectionStatus.mavlink && connectionStatus.server;

  return (
    <header
      className="flex items-center justify-between px-4 py-2 border-b"
      style={{
        borderColor: "oklch(0.75 0.18 192 / 0.2)",
        backgroundColor: "oklch(0.10 0.008 220)",
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-7 h-7 rounded"
          style={{
            backgroundColor: "oklch(0.75 0.18 192 / 0.12)",
            border: "1px solid oklch(0.75 0.18 192 / 0.4)",
          }}
        >
          <Plane size={14} style={{ color: "var(--gcs-teal)" }} />
        </div>
        <div>
          <h1
            className="font-mono text-xs font-bold tracking-[0.2em] uppercase"
            style={{ color: "var(--gcs-teal)" }}
          >
            LAGARI GCS
          </h1>
          <p className="font-mono text-[8px] tracking-widest text-muted-foreground uppercase">
            Ground Control Station v2.1
          </p>
        </div>
        <div className="h-4 w-px bg-border mx-1" />
        <div className="flex items-center gap-1.5">
          <Shield size={10} style={{ color: "var(--gcs-teal)" }} />
          <span
            className="font-mono text-[9px] tracking-widest uppercase"
            style={{ color: "var(--gcs-teal-dim)" }}
          >
            SECURE CHANNEL
          </span>
        </div>
        {teamNumber !== null && (
          <>
            <div className="h-4 w-px bg-border mx-1" />
            <span
              className="font-mono text-[9px] px-2 py-0.5 rounded border tracking-widest"
              style={{
                color: "var(--gcs-teal)",
                borderColor: "oklch(0.75 0.18 192 / 0.3)",
                backgroundColor: "oklch(0.75 0.18 192 / 0.07)",
              }}
            >
              TAKIM #{teamNumber}
            </span>
          </>
        )}
      </div>

      {/* Centre: Status pills */}
      <div className="hidden md:flex items-center gap-2">
        <StatusPill
          label="SYS"
          value={telemetry.otonom ? "OTONOM" : "MANUEL"}
          good={true}
        />
        <StatusPill label="EKF" value="OK" good={connectionStatus.mavlink} />
        <StatusPill label="AHRS" value="OK" good={connectionStatus.mavlink} />
        <StatusPill
          label="SERVER"
          value={connectionStatus.server ? "OK" : "OFFLINE"}
          good={connectionStatus.server}
        />
      </div>

      {/* Right: Link status + UTC */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5">
          {allLinked ? (
            <Wifi size={10} style={{ color: "var(--gcs-green)" }} />
          ) : (
            <WifiOff size={10} style={{ color: "var(--gcs-orange)" }} />
          )}
          <span
            className="font-mono text-[9px]"
            style={{
              color: allLinked ? "var(--gcs-green)" : "var(--gcs-orange)",
            }}
          >
            {allLinked ? "LINK OK" : "NO LINK"}
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 border-l pl-3"
          style={{ borderColor: "var(--border)" }}
        >
          <Clock size={10} className="text-muted-foreground" />
          <span className="font-mono text-[9px] text-muted-foreground tabular-nums">
            {utcTime}
          </span>
        </div>
      </div>
    </header>
  );
}

function StatusPill({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded border"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--gcs-surface)",
      }}
    >
      <span className="font-mono text-[8px] text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className="font-mono text-[9px] font-bold"
        style={{ color: good ? "var(--gcs-teal)" : "var(--gcs-orange)" }}
      >
        {value}
      </span>
    </div>
  );
}
