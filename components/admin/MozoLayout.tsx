import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminAlertsProvider, useAdminAlerts } from "../../contexts/AdminAlertsContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";

/** Detecta Android (no iOS, no desktop) */
function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

const MozoLayoutContent: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showAndroidTip, setShowAndroidTip] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const {
    isSignalRConnected,
    soundEnabled,
    setSoundEnabled,
    soundUnlocked,
    testSound,
  } = useAdminAlerts();
  const { status: pushStatus, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
      isActive
        ? "bg-secondary text-white"
        : "text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans text-gray-800">
      {/* Header */}
      <header className={`${
        isSignalRConnected ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
      } border-b shadow-sm`}>
        {/* Primera fila: título + nav + menú móvil */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <span className="text-secondary font-bold text-sm sm:text-lg whitespace-nowrap">Panel Mozo</span>
            <nav className="flex items-center gap-1">
              <NavLink to="/mozo" end className={navLinkClasses}>
                🪑 <span className="hidden xs:inline">Mesas</span>
              </NavLink>
              <NavLink to="/mozo/cocina" className={navLinkClasses}>
                🍳 <span className="hidden xs:inline">Cocina</span>
              </NavLink>
            </nav>
          </div>

          {/* Botón de menú hamburguesa (mobile) */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showMobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Controles desktop (ocultos en mobile) */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${
                isSignalRConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`} />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {isSignalRConnected ? "Conectado" : "Sin conexión"}
              </span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                soundEnabled ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-300 text-gray-700 hover:bg-gray-400"
              }`}
            >
              {soundEnabled ? "🔊 ON" : "🔇 OFF"}
            </button>
            <button
              onClick={testSound}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                soundUnlocked ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-100 text-blue-800 border border-blue-400 animate-pulse hover:bg-blue-200"
              }`}
              title={soundUnlocked ? "Clic para probar" : "Activar sonido"}
            >
              🔔 {soundUnlocked ? "Probar" : "Activar"}
            </button>
            {pushStatus === 'not-standalone' && (
              <span className="text-xs text-yellow-600 bg-yellow-100 border border-yellow-300 px-2 py-1.5 rounded-lg cursor-help whitespace-nowrap">
                📲 Instalar
              </span>
            )}
            {pushStatus === 'denied' && (
              <span className="text-xs text-red-600 bg-red-100 border border-red-300 px-2 py-1.5 rounded-lg whitespace-nowrap">
                🔕 Bloqueadas
              </span>
            )}
            {pushStatus === 'prompt' && (
              <button onClick={subscribePush} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors whitespace-nowrap">
                🔔 Alertas
              </button>
            )}
            {pushStatus === 'subscribed' && (
              <>
                <button onClick={unsubscribePush} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-red-600 transition-colors whitespace-nowrap">
                  🔔 ON
                </button>
                {isAndroid() && (
                  <button onClick={() => setShowAndroidTip((v) => !v)} className="px-2 py-1.5 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 transition-colors">
                    ⚠️
                  </button>
                )}
              </>
            )}
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-white hover:bg-gray-800 transition-colors whitespace-nowrap">
              Salir
            </button>
          </div>
        </div>

        {/* Menú móvil desplegable */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 bg-white px-3 py-3 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isSignalRConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`} />
                <span className="text-xs text-gray-600">
                  {isSignalRConnected ? "Conectado" : "Sin conexión"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  soundEnabled ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {soundEnabled ? "🔊 Sonido ON" : "🔇 Sonido OFF"}
              </button>
              <button
                onClick={testSound}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  soundUnlocked ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800 border border-blue-400"
                }`}
              >
                🔔 {soundUnlocked ? "Probar" : "Activar"}
              </button>
            </div>

            {pushStatus === 'not-standalone' && (
              <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
                📲 Instalá la app para recibir notificaciones
              </div>
            )}
            {pushStatus === 'denied' && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                🔕 Notificaciones bloqueadas
              </div>
            )}
            {pushStatus === 'prompt' && (
              <button onClick={subscribePush} className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white">
                🔔 Activar alertas push
              </button>
            )}
            {pushStatus === 'subscribed' && (
              <>
                <button onClick={unsubscribePush} className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white">
                  🔔 Alertas activas (tap para desactivar)
                </button>
                {isAndroid() && (
                  <button onClick={() => setShowAndroidTip((v) => !v)} className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                    ⚠️ Consejos para Android
                  </button>
                )}
              </>
            )}

            <button onClick={handleLogout} className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white mt-2">
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {/* Panel de ayuda para Android */}
      {showAndroidTip && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-sm text-yellow-900">
          <p className="font-semibold mb-1">Para recibir alertas con la pantalla apagada en Android:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
            <li>Configuración → Aplicaciones → Chrome → Batería</li>
            <li>Seleccioná <strong>Sin restricciones</strong> (no "Optimizada")</li>
            <li>Configuración → Aplicaciones → Chrome → Datos → Activar datos en segundo plano</li>
          </ol>
          <button onClick={() => setShowAndroidTip(false)} className="mt-2 text-xs text-yellow-700 underline">
            Cerrar
          </button>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-3 sm:p-4">
        <Outlet />
      </main>
    </div>
  );
};

const MozoLayout: React.FC = () => (
  <AdminAlertsProvider>
    <MozoLayoutContent />
  </AdminAlertsProvider>
);

export default MozoLayout;
