// ──────────────────────────────────────────────────────────────────────────────
// Teknofest 2026 Savaşan İHA – Haberleşme Dokümanı Type Definitions
// Field names match the official JSON spec exactly.
// ──────────────────────────────────────────────────────────────────────────────

/** Sunucu saati format – used in all timestamp fields */
export interface ServerTime {
  gun: number         // day
  saat: number        // hour
  dakika: number      // minute
  saniye: number      // second
  milisaniye: number  // millisecond
}

/** GPS timestamp embedded in telemetry (UTC+0, direct from autopilot) */
export type GpsTime = Pick<ServerTime, "saat" | "dakika" | "saniye" | "milisaniye">

// ── POST /api/giris ──────────────────────────────────────────────────────────
export interface LoginRequest {
  kadi: string   // team username
  sifre: string  // team password
}
// Response: plain-text team number (number)

// ── GET /api/sunucusaati ─────────────────────────────────────────────────────
// Response: ServerTime

// ── POST /api/telemetri_gonder ───────────────────────────────────────────────
export interface TelemetriRequest {
  takim_numarasi: number
  iha_enlem: number        // latitude (decimal degrees)
  iha_boylam: number       // longitude (decimal degrees)
  iha_irtifa: number       // altitude AGL (metres)
  iha_dikilme: number      // pitch  –90..+90  deg
  iha_yonelme: number      // heading  0..360   deg (N=0)
  iha_yatis: number        // roll   –90..+90   deg
  iha_hiz: number          // ground speed (m/s, no direction)
  iha_batarya: number      // battery percentage 0–100
  iha_otonom: 0 | 1        // 1 = autonomous mode
  iha_kilitlenme: 0 | 1    // 1 = actively tracking a target
  hedef_merkez_X: number   // target bounding-box centre X (pixels, left=0)
  hedef_merkez_Y: number   // target bounding-box centre Y (pixels, top=0)
  hedef_genislik: number   // target bounding-box width  (pixels)
  hedef_yukseklik: number  // target bounding-box height (pixels)
  gps_saati: GpsTime       // raw GPS time from autopilot (do NOT interpolate)
}

/** Rival UAV entry inside TelemetriResponse.konumBilgileri */
export interface RivalUAV {
  takim_numarasi: number
  iha_enlem: number
  iha_boylam: number
  iha_irtifa: number
  iha_dikilme: number
  iha_yonelme: number
  iha_yatis: number
  iha_hizi: number   // note: "hizi" (with i) in response vs "hiz" in request
  zaman_farki: number  // ms since server received this team's last packet
}

export interface TelemetriResponse {
  sunucusaati: ServerTime
  konumBilgileri: RivalUAV[]
}

// ── POST /api/kilitlenme_bilgisi ─────────────────────────────────────────────
export interface KilitlenmeBilgisiRequest {
  kilitlenmeBitisZamani: GpsTime  // server-time format
  otonom_kilitlenme: 0 | 1
}

// ── POST /api/kamikaze_bilgisi ───────────────────────────────────────────────
export interface KamikazeBilgisiRequest {
  kamikazeBaslangicZamani: GpsTime
  kamikazeBitisZamani: GpsTime
  qrMetni: string  // text decoded from QR code
}

// ── GET /api/qr_koordinati ───────────────────────────────────────────────────
export interface QRKoordinati {
  qrEnlem: number   // latitude
  qrBoylam: number  // longitude
}

// ── GET /api/hss_koordinatlari ───────────────────────────────────────────────
export interface HSSKoordinat {
  id: number
  hssEnlem: number    // centre latitude
  hssBoylam: number   // centre longitude
  hssYaricap: number  // radius (metres)
}

export interface HSSResponse {
  sunucusaati: ServerTime
  hss_koordinat_bilgileri: HSSKoordinat[]
}

// ── HTTP error shape ─────────────────────────────────────────────────────────
export interface ApiError {
  status: number
  message: string
}

export function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "status" in e
}
