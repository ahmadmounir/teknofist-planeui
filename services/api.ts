// ──────────────────────────────────────────────────────────────────────────────
// Teknofest Competition Server – Centralized API Service
// Base URL: VITE_SERVER_URL env var (default: http://127.0.0.25:5000)
// Mock mode: VITE_USE_MOCK_API (default: true)
// All requests use credentials: "include" for session-cookie auth.
// ──────────────────────────────────────────────────────────────────────────────

import type {
  LoginRequest,
  ServerTime,
  TelemetriRequest,
  TelemetriResponse,
  KilitlenmeBilgisiRequest,
  KamikazeBilgisiRequest,
  QRKoordinati,
  HSSResponse,
  ApiError,
} from "@/types/api"

type HttpMethod = "GET" | "POST"

const ENV = (import.meta as unknown as { env: Record<string, string | undefined> }).env

const BASE_URL: string =
  ENV.VITE_SERVER_URL ?? "http://127.0.0.25:5000"

const USE_MOCK_API = (ENV.VITE_USE_MOCK_API ?? "true").toLowerCase() !== "false"
const MOCK_DELAY_MS = 120

const mockState = {
  isAuthenticated: false,
  teamNumber: 1,
  lastTelemetryAtMs: 0,
}

const MOCK_QR_KOORDINATI: QRKoordinati = {
  qrEnlem: 41.51238882,
  qrBoylam: 36.11935778,
}

const MOCK_HSS_ZONES: HSSResponse["hss_koordinat_bilgileri"] = [
  { id: 0, hssEnlem: 40.23260922, hssBoylam: 29.00573015, hssYaricap: 50 },
  { id: 1, hssEnlem: 40.23351019, hssBoylam: 28.99976492, hssYaricap: 50 },
  { id: 2, hssEnlem: 40.23105297, hssBoylam: 29.00744677, hssYaricap: 75 },
  { id: 3, hssEnlem: 40.23090554, hssBoylam: 29.00221109, hssYaricap: 150 },
]

const MOCK_RIVALS: TelemetriResponse["konumBilgileri"] = [
  {
    takim_numarasi: 1,
    iha_enlem: 41.5118256,
    iha_boylam: 36.11993,
    iha_irtifa: 36,
    iha_dikilme: -8,
    iha_yonelme: 127,
    iha_yatis: 19,
    iha_hizi: 41,
    zaman_farki: 467,
  },
  {
    takim_numarasi: 2,
    iha_enlem: 41.5100365,
    iha_boylam: 36.11837,
    iha_irtifa: 44,
    iha_dikilme: 24,
    iha_yonelme: 277,
    iha_yatis: -37,
    iha_hizi: 40,
    zaman_farki: 248,
  },
  {
    takim_numarasi: 3,
    iha_enlem: 41.5123138,
    iha_boylam: 36.12,
    iha_irtifa: 32,
    iha_dikilme: 9,
    iha_yonelme: 13,
    iha_yatis: -30,
    iha_hizi: 45,
    zaman_farki: 30,
  },
]

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function asServerTime(date = new Date()): ServerTime {
  return {
    gun: date.getUTCDate(),
    saat: date.getUTCHours(),
    dakika: date.getUTCMinutes(),
    saniye: date.getUTCSeconds(),
    milisaniye: date.getUTCMilliseconds(),
  }
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function withJitter(value: number, delta: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round((value + rand(-delta, delta)) * factor) / factor
}

function normalizeHeading(value: number): number {
  const normalized = ((value % 360) + 360) % 360
  return Math.round(normalized * 10) / 10
}

function createApiError(status: number, message: string): never {
  const err: ApiError = { status, message }
  throw err
}

function deriveTeamNumber(kadi: string): number {
  const match = kadi.match(/\d+/)
  if (!match) return 1
  const parsed = Number(match[0])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function buildRivals(selfTeamNumber: number): TelemetriResponse["konumBilgileri"] {
  return MOCK_RIVALS.filter((rival) => rival.takim_numarasi !== selfTeamNumber).map((rival) => ({
    ...rival,
    iha_enlem: withJitter(rival.iha_enlem, 0.00018, 7),
    iha_boylam: withJitter(rival.iha_boylam, 0.00018, 7),
    iha_irtifa: withJitter(rival.iha_irtifa, 1.4, 1),
    iha_dikilme: withJitter(rival.iha_dikilme, 4, 1),
    iha_yonelme: normalizeHeading(rival.iha_yonelme + rand(-7, 7)),
    iha_yatis: withJitter(rival.iha_yatis, 5, 1),
    iha_hizi: withJitter(rival.iha_hizi, 2.2, 1),
    zaman_farki: Math.round(rand(25, 650)),
  }))
}

function requireAuth(path: string): void {
  if (!mockState.isAuthenticated && path !== "/api/giris") {
    createApiError(401, "Kimliksiz erisim denemesi. Oturum acmaniz gerekmektedir.")
  }
}

async function mockRequest<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  await delay()

  if (path === "/api/giris") {
    if (method !== "POST") createApiError(404, "Gecersiz URL")
    const req = body as LoginRequest | undefined
    if (!req?.kadi?.trim() || !req?.sifre?.trim()) {
      createApiError(400, "Kullanici adi veya sifre eksik.")
    }
    if (req.kadi.toLowerCase().includes("fail") || req.sifre.toLowerCase().includes("fail")) {
      createApiError(400, "Kullanici adi veya sifre gecersiz.")
    }

    mockState.isAuthenticated = true
    mockState.teamNumber = deriveTeamNumber(req.kadi)
    mockState.lastTelemetryAtMs = 0
    return mockState.teamNumber as T
  }

  requireAuth(path)

  if (path === "/api/sunucusaati" && method === "GET") {
    return asServerTime() as T
  }

  if (path === "/api/telemetri_gonder" && method === "POST") {
    const req = body as TelemetriRequest | undefined
    if (!req || typeof req.takim_numarasi !== "number") {
      createApiError(204, "Gonderilen paketin formati yanlis")
    }

    const now = Date.now()
    if (mockState.lastTelemetryAtMs !== 0 && now - mockState.lastTelemetryAtMs < 450) {
      createApiError(400, "3")
    }
    mockState.lastTelemetryAtMs = now

    const response: TelemetriResponse = {
      sunucusaati: asServerTime(),
      konumBilgileri: buildRivals(req.takim_numarasi),
    }
    return response as T
  }

  if (path === "/api/kilitlenme_bilgisi" && method === "POST") {
    const req = body as KilitlenmeBilgisiRequest | undefined
    if (!req?.kilitlenmeBitisZamani) {
      createApiError(204, "Gonderilen paketin formati yanlis")
    }
    return undefined as T
  }

  if (path === "/api/kamikaze_bilgisi" && method === "POST") {
    const req = body as KamikazeBilgisiRequest | undefined
    if (!req?.kamikazeBaslangicZamani || !req?.kamikazeBitisZamani || !req?.qrMetni?.trim()) {
      createApiError(204, "Gonderilen paketin formati yanlis")
    }
    return undefined as T
  }

  if (path === "/api/qr_koordinati" && method === "GET") {
    return MOCK_QR_KOORDINATI as T
  }

  if (path === "/api/hss_koordinatlari" && method === "GET") {
    const response: HSSResponse = {
      sunucusaati: asServerTime(),
      hss_koordinat_bilgileri: MOCK_HSS_ZONES,
    }
    return response as T
  }

  createApiError(404, "Gecersiz URL")
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  if (USE_MOCK_API) {
    return mockRequest<T>(method, path, body)
  }

  const headers: HeadersInit = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",  // send session cookie on every request
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText)
    const err: ApiError = { status: res.status, message }
    throw err
  }

  // Login endpoint returns a plain number, not JSON
  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>
  }

  const text = await res.text()
  const asNumber = Number(text.trim())
  return (isNaN(asNumber) ? text : asNumber) as T
}

// ── Exported API surface ──────────────────────────────────────────────────────
export const api = {
  /**
   * POST /api/giris
   * Returns team number (number) on success.
   * Throws ApiError { status: 400 } on bad credentials.
   */
  login(req: LoginRequest): Promise<number> {
    return request<number>("POST", "/api/giris", req)
  },

  /**
   * GET /api/sunucusaati
   * Returns current server time. Call once at startup; use offset for drift.
   */
  getServerTime(): Promise<ServerTime> {
    return request<ServerTime>("GET", "/api/sunucusaati")
  },

  /**
   * POST /api/telemetri_gonder  (1 Hz – 2 Hz max)
   * Returns server time + konumBilgileri (rival UAV positions).
   * Throws on 401 (re-login required) or 400 (malformed packet).
   */
  sendTelemetri(req: TelemetriRequest): Promise<TelemetriResponse> {
    return request<TelemetriResponse>("POST", "/api/telemetri_gonder", req)
  },

  /**
   * POST /api/kilitlenme_bilgisi
   * Send once per confirmed lock-on, within 2 s of lock end.
   */
  sendKilitlenme(req: KilitlenmeBilgisiRequest): Promise<void> {
    return request<void>("POST", "/api/kilitlenme_bilgisi", req)
  },

  /**
   * POST /api/kamikaze_bilgisi
   * Send once after successful kamikaze task.
   */
  sendKamikaze(req: KamikazeBilgisiRequest): Promise<void> {
    return request<void>("POST", "/api/kamikaze_bilgisi", req)
  },

  /**
   * GET /api/qr_koordinati
   * Returns QR code GPS position for the kamikaze task.
   */
  getQRKoordinati(): Promise<QRKoordinati> {
    return request<QRKoordinati>("GET", "/api/qr_koordinati")
  },

  /**
   * GET /api/hss_koordinatlari
   * Returns active Air-Defense (HSS) no-fly circles.
   * Returns empty list when no HSS is announced by judges.
   */
  getHSSKoordinatlari(): Promise<HSSResponse> {
    return request<HSSResponse>("GET", "/api/hss_koordinatlari")
  },
}
