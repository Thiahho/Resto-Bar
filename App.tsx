import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { CatalogProvider } from "./hooks/useCatalog";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./contexts/ToastContext";
import { CartProvider } from "./contexts/CartContext";
import CatalogPage from "./components/public/CatalogPage";
import InfoPage from "./components/public/InfoPage";
import LoginPage from "./components/admin/LoginPage";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./components/admin/Dashboard";
import ProductManager from "./components/admin/ProductManager";
import CategoryManager from "./components/admin/CategoryManager";
import SiteSettings from "./components/admin/SiteSettings";
import OrderManager from "./components/admin/OrderManager";
import ModifierManager from "./components/admin/ModifierManager";
import CouponManager from "./components/admin/CouponManager";
import ComboManager from "./components/admin/ComboManager";
import ReportsManager from "./components/admin/ReportsManager";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ToastProvider>
      <CatalogProvider>
        <CartProvider>
          <AuthProvider>
            <HashRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<CatalogPage />} />
                <Route path="/info" element={<InfoPage />} />

                {/* Admin Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<ProductManager />} />
                  <Route path="categories" element={<CategoryManager />} />
                  <Route path="modifiers" element={<ModifierManager />} />
                  <Route path="coupons" element={<CouponManager />} />
                  <Route path="combos" element={<ComboManager />} />
                  <Route path="orders" element={<OrderManager />} />
                  <Route path="reports" element={<ReportsManager />} />
                  <Route path="settings" element={<SiteSettings />} />
                </Route>
              </Routes>
            </HashRouter>
          </AuthProvider>
        </CartProvider>
      </CatalogProvider>
    </ToastProvider>
  );
}

export default App;
