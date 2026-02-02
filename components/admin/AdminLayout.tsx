import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
              🚀 Crecimiento SaaS
            </NavLink>
            <NavLink to="/admin/reports" className={navLinkClasses} onClick={closeMobileMenu}>
              📊 Reportes
            </NavLink>
            <NavLink to="/admin/settings" className={navLinkClasses} onClick={closeMobileMenu}>
              ⚙️ Configuración
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 pt-16 md:pt-8 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
