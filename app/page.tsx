import { AppProvider, useApp } from "@/context/AppContext";
import LoginModal from "@/components/gcs/LoginModal";
import GCSHeader from "@/components/gcs/GCSHeader";
import VideoPanel from "@/components/gcs/VideoPanel";
import TelemetrySidebar from "@/components/gcs/TelemetrySidebar";
import MissionMap from "@/components/gcs/MissionMap";

function GCSDashboard() {
  const { state, confirmLockOn } = useApp();

  if (!state.isAuthenticated) return <LoginModal />;

  return (
    <div
      className="flex flex-col h-screen overflow-hidden font-sans"
      style={{
        background:
          "radial-gradient(ellipse at 20% 50%, oklch(0.13 0.015 210) 0%, oklch(0.09 0.005 220) 60%, oklch(0.08 0.003 230) 100%)",
      }}
    >
      <GCSHeader />
      <main className="grid flex-1 min-h-0 gap-3 p-3 lg:grid-cols-[1fr_300px]">
        {/* الجهة اليسرى: موازنة جديدة بين الفيديو والخريطة */}
        {/* قمنا بتعديل النسب إلى 1.7fr للفيديو و 1.3fr للخريطة */}
        <div className="grid min-h-0 min-w-0 gap-3 lg:grid-rows-[minmax(0,1.7fr)_minmax(0,1.3fr)]">
          {/* منطقة الفيديو - لا تزال كبيرة بما يكفي لعملية القفل (Locking) */}
          <div className="min-h-[250px]">
            <VideoPanel onLockConfirmed={confirmLockOn} />
          </div>

          {/* منطقة الخريطة - أصبحت الآن بمساحة مريحة لعرض طبقات المسابقة */}
          <div
            className="min-h-[250px] rounded-lg border p-3 overflow-hidden"
            style={{
              borderColor: "oklch(0.75 0.18 192 / 0.2)",
              backgroundColor: "var(--gcs-surface)",
            }}
          >
            <MissionMap />
          </div>
        </div>

        {/* الجهة اليمنى: الـ Sidebar */}
        <div
          className="min-w-0 rounded-lg border p-3 overflow-hidden"
          style={{
            borderColor: "oklch(0.75 0.18 192 / 0.2)",
            backgroundColor: "var(--gcs-surface)",
          }}
        >
          <TelemetrySidebar />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <GCSDashboard />
    </AppProvider>
  );
}
