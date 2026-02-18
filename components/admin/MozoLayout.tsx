import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminAlertsProvider, useAdminAlerts } from "../../contexts/AdminAlertsContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";

const MozoLayoutContent: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const {
    isSignalRConnected,
    soundEnabled,
    setSoundEnabled,
    testSound,
  } = useAdminAlerts();
  // null = suscribir a todas las estaciones
  const { status: pushStatus, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-secondary text-white"
        : "text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans text-gray-800">
      {/* Header */}
      <header className={`${
        isSignalRConnected ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
      } border-b px-4 py-3 shadow-sm`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: title + nav */}
          <div className="flex items-center gap-4">
            <span className="text-secondary font-bold text-lg">Panel Mozo</span>
            <nav className="flex items-center gap-1">
              <NavLink to="/mozo" end className={navLinkClasses}>
                Mesas
              </NavLink>
              <NavLink to="/mozo/cocina" className={navLinkClasses}>
                Cocina
              </NavLink>
            </nav>
          </div>

          {/* Right: connection + sound + logout */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${
                isSignalRConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}></span>
              <span className="text-xs text-gray-500">
                {isSignalRConnected ? "Conectado" : "Sin conexión"}
              </span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                soundEnabled
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gray-300 text-gray-700 hover:bg-gray-400"
              }`}
            >
              {soundEnabled ? "Sonido ON" : "Sonido OFF"}
            </button>
            <button
              onClick={testSound}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              title="Probar sonido y desbloquear audio"
            >
              🔔 Probar
            </button>
            {pushStatus === 'not-standalone' && (
              <span
                title="En iOS instalá la app desde Safari → Compartir → Agregar a pantalla de inicio"
                className="text-xs text-yellow-600 bg-yellow-100 border border-yellow-300 px-2 py-1.5 rounded-lg cursor-help"
              >
                📲 Instalar para notificaciones
              </span>
            )}
            {pushStatus === 'denied' && (
              <span className="text-xs text-red-600 bg-red-100 border border-red-300 px-2 py-1.5 rounded-lg">
                🔕 Notif. bloqueadas
              </span>
            )}
            {pushStatus === 'prompt' && (
              <button
                onClick={subscribePush}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                title="Recibir alertas aunque la pantalla esté apagada"
              >
                🔔 Activar alertas
              </button>
            )}
            {pushStatus === 'subscribed' && (
              <button
                onClick={unsubscribePush}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-red-600 transition-colors"
                title="Alertas en segundo plano activas — clic para desactivar"
              >
                🔔 Alertas ON
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4">
        <Outlet />
      </main>
    </div>
  );
};

const MozoLayout: React.FC = () => {
  return (
    <AdminAlertsProvider>
      <MozoLayoutContent />
    </AdminAlertsProvider>
  );
};

export default MozoLayout;
