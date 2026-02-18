import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminAlertsProvider, useAdminAlerts } from "../../contexts/AdminAlertsContext";

// Componente interno que tiene acceso al contexto de alertas
const AdminLayoutContent: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    isSignalRConnected,
    pendingAlerts,
    clearAlerts,
    soundEnabled,
    setSoundEnabled,
    soundUnlocked,
    testSound,
  } = useAdminAlerts();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-2 mt-2 text-gray-100 transition-colors duration-200 transform rounded-md hover:bg-gray-700 ${
      isActive ? "bg-gray-700" : ""
    }`;

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-4 left-4 z-50 bg-secondary text-white p-2 rounded-md shadow-lg"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isMobileMenuOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Sidebar - Desktop and Mobile */}
      <div className={`${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-secondary transition-transform duration-300 ease-in-out md:flex flex-col`}>
        <div className="flex items-center justify-center h-16 bg-gray-900">
          <span className="text-white font-bold uppercase">
            Panel Administrador
          </span>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-2 py-4 bg-secondary">
            <NavLink to="/admin" end className={navLinkClasses} onClick={closeMobileMenu}>
              📊 Panel
            </NavLink>
            <NavLink to="/admin/orders" className={navLinkClasses} onClick={closeMobileMenu}>
              🛒 Órdenes
            </NavLink>
            <NavLink to="/admin/tables" className={navLinkClasses} onClick={closeMobileMenu}>
              🪑 Mesas
            </NavLink>
            <NavLink to="/admin/kitchen" className={navLinkClasses} onClick={closeMobileMenu}>
              🍳 Cocina
            </NavLink>
            <NavLink to="/admin/products" className={navLinkClasses} onClick={closeMobileMenu}>
              🍔 Productos
            </NavLink>
            <NavLink to="/admin/categories" className={navLinkClasses} onClick={closeMobileMenu}>
              📁 Categorias
            </NavLink>
            <NavLink to="/admin/modifiers" className={navLinkClasses} onClick={closeMobileMenu}>
              ➕ Modificadores
            </NavLink>
            <NavLink to="/admin/coupons" className={navLinkClasses} onClick={closeMobileMenu}>
              🏷️ Cupones
            </NavLink>
            <NavLink to="/admin/combos" className={navLinkClasses} onClick={closeMobileMenu}>
              📦 Combos
            </NavLink>
            <NavLink to="/admin/growth" className={navLinkClasses} onClick={closeMobileMenu}>
              🚀 Crecimiento
            </NavLink>
            <NavLink to="/admin/reports" className={navLinkClasses} onClick={closeMobileMenu}>
              📊 Reportes
            </NavLink>
            <NavLink to="/admin/settings" className={navLinkClasses} onClick={closeMobileMenu}>
              ⚙️ Configuración
            </NavLink>
            <NavLink to="/admin/users" className={navLinkClasses} onClick={closeMobileMenu}>
              👥 Usuarios
            </NavLink>
            <NavLink to="/" className={navLinkClasses} onClick={closeMobileMenu}>
              🏪 Volver a la tienda
            </NavLink>
          </nav>
        </div>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Cerrar Sesion
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Banner de alertas global - visible en todos los módulos */}
        <div className={`${
          isSignalRConnected ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
        } border-b px-4 py-3 shadow-sm`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isSignalRConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}></span>
                <span className="font-semibold text-sm">
                  {isSignalRConnected ? "🟢 Alertas en tiempo real activas" : "🟡 Modo respaldo"}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-semibold">Alertas pendientes:</span> {pendingAlerts}
                {!soundUnlocked && (
                  <span className="ml-2 text-xs text-gray-600">(hacé click en "Probar sonido")</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  soundEnabled
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                }`}
              >
                {soundEnabled ? "🔊 Sonido ON" : "🔇 Sonido OFF"}
              </button>
              <button
                onClick={testSound}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                title="Probar sonido y desbloquear audio"
              >
                🔔 Probar
              </button>
              <button
                onClick={clearAlerts}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                ✓ Limpiar
              </button>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 pt-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Componente wrapper que provee el contexto de alertas
const AdminLayout: React.FC = () => {
  return (
    <AdminAlertsProvider>
      <AdminLayoutContent />
    </AdminAlertsProvider>
  );
};

export default AdminLayout;
