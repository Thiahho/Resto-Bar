import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-2 mt-2 text-gray-100 transition-colors duration-200 transform rounded-md hover:bg-gray-700 ${
      isActive ? "bg-gray-700" : ""
    }`;

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div className="hidden md:flex flex-col w-64 bg-secondary">
        <div className="flex items-center justify-center h-16 bg-gray-900">
          <span className="text-white font-bold uppercase">
            Panel Administrador
          </span>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-2 py-4 bg-secondary">
            <NavLink to="/admin" end className={navLinkClasses}>
              📊 Panel
            </NavLink>
            <NavLink to="/admin/orders" className={navLinkClasses}>
              🛒 Órdenes
            </NavLink>
            <NavLink to="/admin/products" className={navLinkClasses}>
              🍔 Productos
            </NavLink>
            <NavLink to="/admin/categories" className={navLinkClasses}>
              📁 Categorias
            </NavLink>
            <NavLink to="/admin/modifiers" className={navLinkClasses}>
              ➕ Modificadores
            </NavLink>
            <NavLink to="/admin/coupons" className={navLinkClasses}>
              🏷️ Cupones
            </NavLink>
            <NavLink to="/admin/combos" className={navLinkClasses}>
              📦 Combos
            </NavLink>
            <NavLink to="/admin/reports" className={navLinkClasses}>
              📊 Reportes
            </NavLink>
            <NavLink to="/admin/settings" className={navLinkClasses}>
              ⚙️ Configuración
            </NavLink>
            <NavLink to="/" className={navLinkClasses}>
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
