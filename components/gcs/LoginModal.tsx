import { useState, type FormEvent } from "react"
import { useApp } from "@/context/AppContext"
import { Plane, Lock, User, AlertCircle } from "lucide-react"

export default function LoginModal() {
  const { login, state } = useApp()
  const [kadi, setKadi] = useState("")
  const [sifre, setSifre] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!kadi || !sifre || loading) return
    setLoading(true)
    await login(kadi, sifre)
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at 20% 50%, oklch(0.13 0.015 210) 0%, oklch(0.09 0.005 220) 60%, oklch(0.08 0.003 230) 100%)",
      }}
    >
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,240,0.4) 2px, rgba(0,255,240,0.4) 3px)",
        }}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex flex-col gap-6 rounded-xl border p-8 w-full max-w-sm"
        style={{
          borderColor: "oklch(0.75 0.18 192 / 0.3)",
          backgroundColor: "oklch(0.10 0.008 220)",
          boxShadow: "0 0 40px oklch(0.75 0.18 192 / 0.08)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-lg"
            style={{ backgroundColor: "oklch(0.75 0.18 192 / 0.1)", border: "1px solid oklch(0.75 0.18 192 / 0.4)" }}
          >
            <Plane size={22} style={{ color: "var(--gcs-teal)" }} />
          </div>
          <div className="text-center">
            <h1 className="font-mono text-sm font-bold tracking-[0.25em] uppercase" style={{ color: "var(--gcs-teal)" }}>
              LAGARI GCS
            </h1>
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mt-0.5">
              Ground Control Station v2.1
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ backgroundColor: "oklch(0.75 0.18 192 / 0.2)" }} />
          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">Authentication</span>
          <div className="h-px flex-1" style={{ backgroundColor: "oklch(0.75 0.18 192 / 0.2)" }} />
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase" htmlFor="kadi">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="kadi"
                type="text"
                value={kadi}
                onChange={(e) => setKadi(e.target.value)}
                autoComplete="username"
                required
                className="w-full rounded border bg-transparent pl-8 pr-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-all"
                style={{ borderColor: "oklch(0.75 0.18 192 / 0.25)", ["--tw-ring-color" as string]: "oklch(0.75 0.18 192 / 0.5)" }}
                placeholder="takim_kadi"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase" htmlFor="sifre">
              Şifre
            </label>
            <div className="relative">
              <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="sifre"
                type="password"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded border bg-transparent pl-8 pr-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-all"
                style={{ borderColor: "oklch(0.75 0.18 192 / 0.25)", ["--tw-ring-color" as string]: "oklch(0.75 0.18 192 / 0.5)" }}
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {state.loginError && (
          <div
            className="flex items-center gap-2 rounded px-3 py-2"
            style={{ backgroundColor: "oklch(0.55 0.22 25 / 0.12)", border: "1px solid oklch(0.55 0.22 25 / 0.3)" }}
          >
            <AlertCircle size={12} style={{ color: "var(--gcs-red)", flexShrink: 0 }} />
            <span className="font-mono text-[10px]" style={{ color: "var(--gcs-red)" }}>
              {state.loginError}
            </span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded font-mono text-xs tracking-widest uppercase font-bold border transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
          style={{
            color: "var(--gcs-teal)",
            borderColor: "oklch(0.75 0.18 192 / 0.5)",
            backgroundColor: "oklch(0.75 0.18 192 / 0.08)",
          }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = "oklch(0.75 0.18 192 / 0.16)" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "oklch(0.75 0.18 192 / 0.08)" }}
        >
          {loading ? "Bağlanıyor..." : "Giriş Yap"}
        </button>

        {/* Footer */}
        <p className="text-center font-mono text-[8px] tracking-widest text-muted-foreground/50 uppercase">
          UQAB — TEKNOFEST 2026
        </p>
      </form>
    </div>
  )
}
