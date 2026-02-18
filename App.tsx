import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { CatalogProvider } from "./hooks/useCatalog";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./contexts/ToastContext";
import { CartProvider } from "./contexts/CartContext";
import { KitchenProvider } from "./contexts/KitchenContext";
import CatalogPage from "./components/public/CatalogPage";
import InfoPage from "./components/public/InfoPage";
import OrderTrackingPage from "./components/public/OrderTrackingPage";
import TableOrderPage from "./components/public/TableOrderPage";
import LoginPage from "./components/admin/LoginPage";
import AdminLayout from "./components/admin/AdminLayout";
import MozoLayout from "./components/admin/MozoLayout";
import Dashboard from "./components/admin/Dashboard";
import ProductManager from "./components/admin/ProductManager";
import CategoryManager from "./components/admin/CategoryManager";
import SiteSettings from "./components/admin/SiteSettings";
import OrderManager from "./components/admin/OrderManager";
import ModifierManager from "./components/admin/ModifierManager";
import CouponManager from "./components/admin/CouponManager";
import ComboManager from "./components/admin/ComboManager";
import ReportsManager from "./components/admin/ReportsManager";
import GrowthManager from "./components/admin/GrowthManager";
import KitchenViewPage from "./components/admin/KitchenViewPage";
import TableManager from "./components/admin/TableManager";

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, userRole } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && userRole !== requiredRole) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <ToastProvider>
      <CatalogProvider>
        <CartProvider>
          <AuthProvider>
            <KitchenProvider>
              <HashRouter>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<CatalogPage />} />
                  <Route path="/info" element={<InfoPage />} />
                  <Route path="/pedido/:code" element={<OrderTrackingPage />} />
                  <Route path="/mesa/:tableId" element={<CartProvider><TableOrderPage /></CartProvider>} />

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
                    <Route path="growth" element={<GrowthManager />} />
                    <Route path="orders" element={<OrderManager />} />
                    <Route path="reports" element={<ReportsManager />} />
                    <Route path="settings" element={<SiteSettings />} />
                    <Route path="tables" element={<TableManager />} />
                    <Route path="kitchen" element={<KitchenViewPage />} />
                  </Route>

                  {/* Mozo Routes */}
                  <Route
                    path="/mozo"
                    element={
                      <ProtectedRoute requiredRole="Mozo">
                        <MozoLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<TableManager />} />
                  </Route>
                </Routes>
              </HashRouter>
            </KitchenProvider>
          </AuthProvider>
        </CartProvider>
      </CatalogProvider>
    </ToastProvider>
  );
}

export default App;
