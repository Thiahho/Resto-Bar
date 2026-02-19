import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminAlertsProvider, useAdminAlerts } from "../../contexts/AdminAlertsContext";

const CocinaLayoutContent: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isSignalRConnected, soundEnabled, setSoundEnabled, soundUnlocked, testSound } = useAdminAlerts();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-screen bg-charcoal-900 font-sans">
      {/* Header */}
      <header className={`${
        isSignalRConnected ? "bg-emerald-900/40 border-emerald-700" : "bg-amber-900/40 border-amber-700"
      } border-b px-4 py-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-neon-orange font-bold text-lg">🍳 Cocina</span>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${
                isSignalRConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`} />
              <span className="text-xs text-gray-400">
                {isSignalRConnected ? "Conectado" : "Sin conexión"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                soundEnabled
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gray-600 text-gray-300 hover:bg-gray-500"
              }`}
            >
              {soundEnabled ? "🔊 Sonido ON" : "🔇 Sonido OFF"}
            </button>
            <button
              onClick={testSound}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                soundUnlocked
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-900 text-blue-300 border border-blue-500 animate-pulse hover:bg-blue-800"
              }`}
              title={soundUnlocked ? "Clic para probar el sonido" : "Tocá para activar el sonido de alertas"}
            >
              {soundUnlocked ? "🔔 Probar" : "🔔 Activar sonido"}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

const CocinaLayout: React.FC = () => (
  <AdminAlertsProvider>
    <CocinaLayoutContent />
  </AdminAlertsProvider>
);

export default CocinaLayout;
