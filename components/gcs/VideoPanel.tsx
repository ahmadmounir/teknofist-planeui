import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import ArtificialHorizon from "@/components/gcs/ArtificialHorizon";

// ──────────────────────────────────────────────────────────────────────────────
// Live feed source: uqab_video_server's MJPEG endpoint (video_stream_node,
// package uqab_video_server). Default matches that node's default port (8080)
// on localhost for same-machine dev/testing.
// ──────────────────────────────────────────────────────────────────────────────
const ENV = (import.meta as unknown as { env: Record<string, string | undefined> }).env
const VIDEO_STREAM_URL = ENV.VITE_VIDEO_STREAM_URL ?? "http://127.0.0.1:8080/stream"
const RECONNECT_DELAY_MS = 1000

interface VideoPanelProps {
  onLockConfirmed: (otonom: boolean) => Promise<void>;
}

export default function VideoPanel({ onLockConfirmed }: VideoPanelProps) {
  const { state, setVideoConnected } = useApp();
  const { telemetry } = state;
  const [flash, setFlash] = useState(false);
  const [videoOk, setVideoOk] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 600);
    return () => clearTimeout(t);
  }, [telemetry.irtifa, telemetry.hiz, telemetry.batarya]);

  // MJPEG multipart streams don't auto-reconnect on drop, so retry with backoff
  // and cache-bust the URL to force a fresh GET /stream.
  const handleStreamLoad = useCallback(() => {
    setVideoOk(true);
    setVideoConnected(true);
  }, [setVideoConnected]);

  const handleStreamError = useCallback(() => {
    setVideoOk(false);
    setVideoConnected(false);
    if (retryTimeoutRef.current) return;
    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;
      setReloadToken((t) => t + 1);
    }, RECONNECT_DELAY_MS);
  }, [setVideoConnected]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  const streamSrc = `${VIDEO_STREAM_URL}${VIDEO_STREAM_URL.includes("?") ? "&" : "?"}t=${reloadToken}`;

  const batteryColor =
    telemetry.batarya > 50
      ? "var(--gcs-green)"
      : telemetry.batarya > 20
        ? "var(--gcs-orange)"
        : "var(--gcs-red)";

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-black border border-border gcs-border-teal">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-[0.03]"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,240,0.4) 2px, rgba(0,255,240,0.4) 3px)",
          }}
        />
      </div>

      {/* Live camera feed — uqab_video_server MJPEG stream */}
      <img
        key={reloadToken}
        src={streamSrc}
        onLoad={handleStreamLoad}
        onError={handleStreamError}
        alt="Live UAV camera feed"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Placeholder — shown until the first frame loads, or after a drop */}
      {!videoOk && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-full h-full"
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(0.14 0.02 220) 0%, oklch(0.08 0.005 220) 100%)",
            }}
          >
            {/* Grid */}
            <svg
              className="absolute inset-0 w-full h-full opacity-10"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="grid"
                  width="60"
                  height="60"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 60 0 L 0 0 0 60"
                    fill="none"
                    stroke="oklch(0.75 0.18 192)"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <p className="font-mono text-xs text-muted-foreground opacity-40 tracking-widest uppercase">
                Awaiting Video Stream
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Centre reticle — turns red on lock */}
      <div
        className="absolute inset-0 flex items-center justify-center z-20"
        aria-hidden="true"
      >
        {telemetry.kilitlenme ? (
          // Kilitlenme bounding box (kırmızı, şartname 6.1.1)
          <svg
            className="absolute"
            style={{
              left: `${telemetry.hedefMerkezX - telemetry.hedefGenislik / 2}px`,
              top: `${telemetry.hedefMerkezY - telemetry.hedefYukseklik / 2}px`,
              width: telemetry.hedefGenislik || 80,
              height: telemetry.hedefYukseklik || 80,
            }}
          >
            <rect
              x="1"
              y="1"
              width="100%"
              height="100%"
              fill="none"
              stroke="#FF0000"
              strokeWidth="2"
            />
          </svg>
        ) : null}

        {/* Standard crosshair */}
        <svg width="60" height="60" viewBox="0 0 60 60">
          <line
            x1="30"
            y1="0"
            x2="30"
            y2="22"
            stroke="oklch(0.75 0.18 192)"
            strokeWidth="1"
            opacity="0.6"
          />
          <line
            x1="30"
            y1="38"
            x2="30"
            y2="60"
            stroke="oklch(0.75 0.18 192)"
            strokeWidth="1"
            opacity="0.6"
          />
          <line
            x1="0"
            y1="30"
            x2="22"
            y2="30"
            stroke="oklch(0.75 0.18 192)"
            strokeWidth="1"
            opacity="0.6"
          />
          <line
            x1="38"
            y1="30"
            x2="60"
            y2="30"
            stroke="oklch(0.75 0.18 192)"
            strokeWidth="1"
            opacity="0.6"
          />
          <circle
            cx="30"
            cy="30"
            r="6"
            fill="none"
            stroke={telemetry.kilitlenme ? "#FF0000" : "oklch(0.68 0.22 45)"}
            strokeWidth={telemetry.kilitlenme ? 2 : 1}
            opacity="0.9"
          />
        </svg>
      </div>

      {/* TOP-LEFT: LIVE badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <span className="flex items-center gap-1.5 bg-black/70 border border-border rounded px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase">
          <span
            className={`w-1.5 h-1.5 rounded-full inline-block ${videoOk ? "bg-red-500 animate-pulse" : "bg-zinc-500"}`}
          />
          <span className={videoOk ? "text-red-400" : "text-muted-foreground"}>
            {videoOk ? "LIVE" : "NO SIGNAL"}
          </span>
        </span>
      </div>

      {/* TOP-RIGHT: Mission clock + server time */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <ServerTimestamp />
        <MissionClock />
      </div>

      {/* BOTTOM-LEFT: HUD cluster (horizon + quick flight numbers) */}
      <div className="absolute bottom-3 left-3 z-20 flex items-end gap-2.5">
        <div className="flex flex-col gap-1.5">
          <TelemetryCard
            label="ALT"
            value={telemetry.irtifa.toFixed(1)}
            unit="m"
            flash={flash}
          />
          <TelemetryCard
            label="SPD"
            value={telemetry.hiz.toFixed(1)}
            unit="m/s"
            flash={flash}
          />
        </div>
      </div>


      {/* Lock-on indicator */}
      {telemetry.kilitlenme && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded border font-mono text-[10px] tracking-widest uppercase animate-pulse"
          style={{
            color: "#FF0000",
            borderColor: "#FF0000",
            backgroundColor: "rgba(255,0,0,0.1)",
          }}
        >
          KİLİTLENDİ
        </div>
      )}
    </div>
  );
}

function TelemetryCard({
  label,
  value,
  unit,
  flash,
}: {
  label: string;
  value: string;
  unit: string;
  flash: boolean;
}) {
  return (
    <div className="bg-black/70 border border-border rounded px-2.5 py-1 flex items-center gap-2">
      <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase w-6">
        {label}
      </span>
      <span
        className={`font-mono text-sm font-bold tabular-nums transition-opacity ${flash ? "opacity-60" : "opacity-100"}`}
        style={{ color: "var(--gcs-teal)" }}
      >
        {value}
      </span>
      <span className="font-mono text-[9px] text-muted-foreground">{unit}</span>
    </div>
  );
}

function MissionClock() {
  const [time, setTime] = useState("00:00:00");

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setTime(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`,
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-black/70 border border-border rounded px-2.5 py-1 flex items-center gap-2">
      <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
        T+
      </span>
      <span
        className="font-mono text-xs tabular-nums"
        style={{ color: "var(--gcs-teal)" }}
      >
        {time}
      </span>
    </div>
  );
}

function HudMini({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="font-mono text-[8px] tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className="text-right font-mono text-[9px] tabular-nums"
        style={{ color: "var(--gcs-teal-dim)" }}
      >
        {value}
      </span>
    </>
  );
}

// Sunucu saati damgası — şartname 6.1.1: milisaniye hassasiyetinde, sağ üst köşe
function ServerTimestamp() {
  const { state } = useApp();
  const t = state.serverTime;
  if (!t) return null;
  const ms = String(t.milisaniye).padStart(3, "0");
  const label = `${String(t.saat).padStart(2, "0")}:${String(t.dakika).padStart(2, "0")}:${String(t.saniye).padStart(2, "0")}.${ms}`;
  return (
    <div className="bg-black/70 border border-border rounded px-2.5 py-1 flex items-center gap-2">
      <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
        SRV
      </span>
      <span
        className="font-mono text-[10px] tabular-nums"
        style={{ color: "var(--gcs-teal-dim)" }}
      >
        {label}
      </span>
    </div>
  );
}
