import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { api } from "@/services/api";
import { isApiError } from "@/types/api";
import type {
  ServerTime,
  RivalUAV,
  HSSKoordinat,
  QRKoordinati,
  TelemetriRequest,
  KilitlenmeBilgisiRequest,
  KamikazeBilgisiRequest,
  GpsTime,
} from "@/types/api";

// ── Live telemetry shape (filled by MAVLink WebSocket bridge) ─────────────────
export interface LiveTelemetry {
  enlem: number;
  boylam: number;
  irtifa: number;
  dikilme: number; // pitch
  yonelme: number; // heading
  yatis: number; // roll
  hiz: number;
  batarya: number;
  otonom: boolean;
  // Lock-on tracking (set by image-processing layer)
  kilitlenme: boolean;
  hedefMerkezX: number;
  hedefMerkezY: number;
  hedefGenislik: number;
  hedefYukseklik: number;
  gpsTime: GpsTime;
}

const DEFAULT_TELEMETRY: LiveTelemetry = {
  enlem: 41.508775,
  boylam: 36.118335,
  irtifa: 82,
  dikilme: 0,
  yonelme: 210,
  yatis: 0,
  hiz: 34,
  batarya: 87,
  otonom: false,
  kilitlenme: false,
  hedefMerkezX: 0,
  hedefMerkezY: 0,
  hedefGenislik: 0,
  hedefYukseklik: 0,
  gpsTime: { saat: 0, dakika: 0, saniye: 0, milisaniye: 0 },
};

// ── App-wide state ────────────────────────────────────────────────────────────
interface AppState {
  isAuthenticated: boolean;
  teamNumber: number | null;
  serverTime: ServerTime | null;
  serverTimeOffset: number; // ms difference between server and local clock
  rivals: RivalUAV[];
  hssZones: HSSKoordinat[];
  qrLocation: QRKoordinati | null;
  telemetry: LiveTelemetry;
  connectionStatus: {
    mavlink: boolean;
    rpi: boolean;
    server: boolean;
  };
  loginError: string | null;
}

const initialState: AppState = {
  isAuthenticated: false,
  teamNumber: null,
  serverTime: null,
  serverTimeOffset: 0,
  rivals: [],
  hssZones: [],
  qrLocation: null,
  telemetry: DEFAULT_TELEMETRY,
  connectionStatus: { mavlink: false, rpi: false, server: false },
  loginError: null,
};

// ── Reducer ───────────────────────────────────────────────────────────────────
type Action =
  | { type: "LOGIN_SUCCESS"; teamNumber: number }
  | { type: "LOGIN_ERROR"; message: string }
  | { type: "LOGOUT" }
  | { type: "SET_SERVER_TIME"; time: ServerTime; offset: number }
  | { type: "SET_RIVALS"; rivals: RivalUAV[] }
  | { type: "SET_HSS"; zones: HSSKoordinat[] }
  | { type: "SET_QR"; location: QRKoordinati }
  | { type: "UPDATE_TELEMETRY"; data: Partial<LiveTelemetry> }
  | {
      type: "SET_CONNECTION";
      key: "mavlink" | "rpi" | "server";
      value: boolean;
    };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return {
        ...state,
        isAuthenticated: true,
        teamNumber: action.teamNumber,
        loginError: null,
      };
    case "LOGIN_ERROR":
      return { ...state, isAuthenticated: false, loginError: action.message };
    case "LOGOUT":
      return { ...initialState };
    case "SET_SERVER_TIME":
      return {
        ...state,
        serverTime: action.time,
        serverTimeOffset: action.offset,
      };
    case "SET_RIVALS":
      return { ...state, rivals: action.rivals };
    case "SET_HSS":
      return { ...state, hssZones: action.zones };
    case "SET_QR":
      return { ...state, qrLocation: action.location };
    case "UPDATE_TELEMETRY":
      return { ...state, telemetry: { ...state.telemetry, ...action.data } };
    case "SET_CONNECTION":
      return {
        ...state,
        connectionStatus: {
          ...state.connectionStatus,
          [action.key]: action.value,
        },
      };
    default:
      return state;
  }
}

// ── Context interface ─────────────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  login: (kadi: string, sifre: string) => Promise<void>;
  logout: () => void;
  updateTelemetry: (data: Partial<LiveTelemetry>) => void;
  confirmLockOn: (otonom: boolean) => Promise<void>;
  sendKamikaze: (req: KamikazeBilgisiRequest) => Promise<void>;
  fetchQR: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

// ── Server-time helpers ───────────────────────────────────────────────────────
function serverTimeFromOffset(offset: number): GpsTime {
  const now = Date.now() + offset;
  const d = new Date(now);
  return {
    saat: d.getUTCHours(),
    dakika: d.getUTCMinutes(),
    saniye: d.getUTCSeconds(),
    milisaniye: d.getUTCMilliseconds(),
  };
}

function serverTimeToMs(t: ServerTime): number {
  return ((t.saat * 60 + t.dakika) * 60 + t.saniye) * 1000 + t.milisaniye;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const telemetryLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hssLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const telemetryInFlightRef = useRef(false);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (kadi: string, sifre: string) => {
    try {
      const teamNumber = await api.login({ kadi, sifre });
      dispatch({ type: "LOGIN_SUCCESS", teamNumber });

      // Calibrate server time immediately after login
      const localBefore = Date.now();
      const serverTime = await api.getServerTime();
      const localAfter = Date.now();
      const serverMs = serverTimeToMs(serverTime);
      const localMs = localBefore + Math.round((localAfter - localBefore) / 2);
      const todayMs = localMs % (24 * 3600 * 1000);
      const offset = serverMs - todayMs;
      dispatch({ type: "SET_SERVER_TIME", time: serverTime, offset });
      dispatch({ type: "SET_CONNECTION", key: "server", value: true });
    } catch (e) {
      if (isApiError(e)) {
        dispatch({
          type: "LOGIN_ERROR",
          message:
            e.status === 400
              ? "Kullanıcı adı veya şifre hatalı."
              : `Sunucu hatası (${e.status}): ${e.message}`,
        });
      } else {
        dispatch({ type: "LOGIN_ERROR", message: "Sunucuya bağlanılamadı." });
      }
    }
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
  }, []);

  // ── Telemetry update (called by MAVLink bridge or simulation) ──────────────
  const updateTelemetry = useCallback((data: Partial<LiveTelemetry>) => {
    dispatch({ type: "UPDATE_TELEMETRY", data });
    // If we're receiving MAVLink data, mark connection live
    if (data.enlem !== undefined || data.irtifa !== undefined) {
      dispatch({ type: "SET_CONNECTION", key: "mavlink", value: true });
      dispatch({ type: "SET_CONNECTION", key: "rpi", value: true });
    }
  }, []);

  // ── Lock-on confirmed (call from HUD when 4-second lock is done) ───────────
  const confirmLockOn = useCallback(async (otonom: boolean) => {
    const offset = stateRef.current.serverTimeOffset;
    const req: KilitlenmeBilgisiRequest = {
      kilitlenmeBitisZamani: serverTimeFromOffset(offset),
      otonom_kilitlenme: otonom ? 1 : 0,
    };
    try {
      await api.sendKilitlenme(req);
    } catch (e) {
      if (isApiError(e) && e.status === 401) {
        dispatch({ type: "LOGOUT" });
      }
      console.error("[GCS] Kilitlenme paketi gönderilemedi:", e);
    }
  }, []);

  // ── Kamikaze ───────────────────────────────────────────────────────────────
  const sendKamikaze = useCallback(async (req: KamikazeBilgisiRequest) => {
    try {
      await api.sendKamikaze(req);
    } catch (e) {
      if (isApiError(e) && e.status === 401) dispatch({ type: "LOGOUT" });
      console.error("[GCS] Kamikaze paketi gönderilemedi:", e);
    }
  }, []);

  // ── Fetch QR location ──────────────────────────────────────────────────────
  const fetchQR = useCallback(async () => {
    try {
      const qr = await api.getQRKoordinati();
      dispatch({ type: "SET_QR", location: qr });
    } catch (e) {
      console.error("[GCS] QR koordinatı alınamadı:", e);
    }
  }, []);

  // ── Telemetry loop (1 Hz) – starts when authenticated ─────────────────────
  useEffect(() => {
    if (!state.isAuthenticated || state.teamNumber === null) {
      if (telemetryLoopRef.current) clearInterval(telemetryLoopRef.current);
      return;
    }

    const teamNumber = state.teamNumber;

    const tick = async () => {
      const s = stateRef.current;
      if (!s.isAuthenticated) return;
      if (telemetryInFlightRef.current) return;

      telemetryInFlightRef.current = true;

      const t = s.telemetry;
      const req: TelemetriRequest = {
        takim_numarasi: teamNumber,
        iha_enlem: t.enlem,
        iha_boylam: t.boylam,
        iha_irtifa: t.irtifa,
        iha_dikilme: t.dikilme,
        iha_yonelme: t.yonelme,
        iha_yatis: t.yatis,
        iha_hiz: t.hiz,
        iha_batarya: t.batarya,
        iha_otonom: t.otonom ? 1 : 0,
        iha_kilitlenme: t.kilitlenme ? 1 : 0,
        hedef_merkez_X: t.kilitlenme ? t.hedefMerkezX : 0,
        hedef_merkez_Y: t.kilitlenme ? t.hedefMerkezY : 0,
        hedef_genislik: t.kilitlenme ? t.hedefGenislik : 0,
        hedef_yukseklik: t.kilitlenme ? t.hedefYukseklik : 0,
        gps_saati: serverTimeFromOffset(s.serverTimeOffset),
      };

      try {
        const res = await api.sendTelemetri(req);
        dispatch({ type: "SET_RIVALS", rivals: res.konumBilgileri });
        dispatch({
          type: "SET_SERVER_TIME",
          time: res.sunucusaati,
          offset: s.serverTimeOffset,
        });
        dispatch({ type: "SET_CONNECTION", key: "server", value: true });
      } catch (e) {
        if (isApiError(e)) {
          if (e.status === 401) {
            dispatch({ type: "LOGOUT" });
          } else {
            console.error(`[GCS] Telemetri hatası (${e.status}):`, e.message);
          }
        }
        dispatch({ type: "SET_CONNECTION", key: "server", value: false });
      } finally {
        telemetryInFlightRef.current = false;
      }
    };

    // Strict telemetry cadence: exactly one request every 1000 ms
    telemetryLoopRef.current = setInterval(tick, 1000);

    return () => {
      if (telemetryLoopRef.current) clearInterval(telemetryLoopRef.current);
    };
  }, [state.isAuthenticated, state.teamNumber]);

  // ── HSS polling loop (every 10 s) ─────────────────────────────────────────
  useEffect(() => {
    if (!state.isAuthenticated) {
      if (hssLoopRef.current) clearInterval(hssLoopRef.current);
      return;
    }

    const pollHSS = async () => {
      try {
        const res = await api.getHSSKoordinatlari();
        dispatch({ type: "SET_HSS", zones: res.hss_koordinat_bilgileri });
      } catch {
        // Non-fatal: empty list if judges haven't announced
      }
    };

    void pollHSS();
    hssLoopRef.current = setInterval(pollHSS, 10_000);

    return () => {
      if (hssLoopRef.current) clearInterval(hssLoopRef.current);
    };
  }, [state.isAuthenticated]);

  // ── Simulated MAVLink data (replace with real WebSocket bridge) ────────────
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const id = setInterval(() => {
      dispatch({
        type: "UPDATE_TELEMETRY",
        data: {
          irtifa: +(
            stateRef.current.telemetry.irtifa +
            (Math.random() - 0.5) * 0.6
          ).toFixed(1),
          hiz: +(
            stateRef.current.telemetry.hiz +
            (Math.random() - 0.5) * 1
          ).toFixed(1),
          batarya: Math.max(
            0,
            stateRef.current.telemetry.batarya - (Math.random() > 0.97 ? 1 : 0),
          ),
          dikilme: +(
            stateRef.current.telemetry.dikilme +
            (Math.random() - 0.5) * 1.6
          ).toFixed(2),
          yatis: +(
            stateRef.current.telemetry.yatis +
            (Math.random() - 0.5) * 2.4
          ).toFixed(2),
          gpsTime: serverTimeFromOffset(stateRef.current.serverTimeOffset),
        },
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.isAuthenticated]);

  const value: AppContextValue = {
    state,
    login,
    logout,
    updateTelemetry,
    confirmLockOn,
    sendKamikaze,
    fetchQR,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
