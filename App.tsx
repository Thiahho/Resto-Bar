import React, { lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { CatalogProvider } from "./hooks/useCatalog";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./contexts/ToastContext";
import { CartProvider } from "./contexts/CartContext";
import { KitchenProvider } from "./contexts/KitchenContext";
// Rutas públicas principales — carga inmediata
import CatalogPage from "./components/public/CatalogPage";
// Rutas públicas secundarias — lazy
const InfoPage = lazy(() => import("./components/public/InfoPage"));
const OrderTrackingPage = lazy(() => import("./components/public/OrderTrackingPage"));
const TableOrderPage = lazy(() => import("./components/public/TableOrderPage"));
// Rutas de admin/staff — lazy (el cliente nunca las descarga)
const LoginPage = lazy(() => import("./components/admin/LoginPage"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const MozoLayout = lazy(() => import("./components/admin/MozoLayout"));
const CocinaLayout = lazy(() => import("./components/admin/CocinaLayout"));
const Dashboard = lazy(() => import("./components/admin/Dashboard"));
const ProductManager = lazy(() => import("./components/admin/ProductManager"));
const CategoryManager = lazy(() => import("./components/admin/CategoryManager"));
const SiteSettings = lazy(() => import("./components/admin/SiteSettings"));
const OrderManager = lazy(() => import("./components/admin/OrderManager"));
const ModifierManager = lazy(() => import("./components/admin/ModifierManager"));
const CouponManager = lazy(() => import("./components/admin/CouponManager"));
const ComboManager = lazy(() => import("./components/admin/ComboManager"));
const ReportsManager = lazy(() => import("./components/admin/ReportsManager"));
const GrowthManager = lazy(() => import("./components/admin/GrowthManager"));
const KitchenViewPage = lazy(() => import("./components/admin/KitchenViewPage"));
const TableManager = lazy(() => import("./components/admin/TableManager"));
const UsersManager = lazy(() => import("./components/admin/UsersManager"));

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, userRole } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && userRole !== requiredRole) {
    if (userRole === "Mozo") return <Navigate to="/mozo" replace />;
    if (userRole === "Cocinero") return <Navigate to="/cocina" replace />;
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <ToastProvider>
      <CatalogProvider>
        <CartProvider>
          <AuthProvider>
            <HashRouter>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div></div>}>
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
                    <ProtectedRoute requiredRole="Admin">
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
                  <Route path="kitchen" element={<KitchenProvider><KitchenViewPage /></KitchenProvider>} />
                  <Route path="users" element={<UsersManager />} />
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
                  <Route path="cocina" element={<KitchenProvider><KitchenViewPage /></KitchenProvider>} />
                </Route>

                {/* Cocinero Routes */}
                <Route
                  path="/cocina"
                  element={
                    <ProtectedRoute requiredRole="Cocinero">
                      <CocinaLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<KitchenProvider><KitchenViewPage /></KitchenProvider>} />
                </Route>
              </Routes>
            </Suspense>
            </HashRouter>
          </AuthProvider>
        </CartProvider>
      </CatalogProvider>
    </ToastProvider>
  );
}

export default App;
