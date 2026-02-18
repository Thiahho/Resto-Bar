import React, { useState, useEffect, useMemo } from "react";
import { useOrders } from "../../hooks/useOrders";
import { useToast } from "../../contexts/ToastContext";
import { OrderResponse, ParsedModifiers } from "../../types";
import CajaPage from "./CajaPage";

interface DailySales {
  date: string;
  totalCents: number;
  ordersCount: number;
  avgTicketCents: number;
}

interface ProductSales {
  name: string;
  quantity: number;
  totalCents: number;
}

const ReportsManager: React.FC = () => {
  const { orders, loading, fetchOrders } = useOrders();
  const { showToast } = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"resumen" | "ordenes" | "productos" | "caja">("resumen");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState("");
  const ORDERS_PER_PAGE = 15;

  // Estados para paginación y ordenamiento de ventas por día
  const [dailySalesPage, setDailySalesPage] = useState(1);
  const [dailySalesSort, setDailySalesSort] = useState<"date-asc" | "date-desc" | "total-asc" | "total-desc">("date-desc");
  const ITEMS_PER_PAGE = 10;

  // Inicializar fechas (último mes por defecto)
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    setDateTo(today.toISOString().split("T")[0]);
    setDateFrom(lastMonth.toISOString().split("T")[0]);
  }, []);

  // Resetear paginación cuando cambien los filtros
  useEffect(() => {
    setDailySalesPage(1);
    setOrdersPage(1);
  }, [dateFrom, dateTo, dailySalesSort, orderSearch]);

  // Filtrar órdenes por fecha
  const filteredOrders = useMemo(() => {
    if (!dateFrom || !dateTo) return orders;
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      const orderDateStr = orderDate.toLocaleDateString("en-CA");
      return orderDateStr >= dateFrom && orderDateStr <= dateTo;
    });
  }, [orders, dateFrom, dateTo]);

  // Filtrar órdenes por búsqueda
  const searchedOrders = useMemo(() => {
    if (!orderSearch.trim()) return filteredOrders;
    const search = orderSearch.toLowerCase();
    return filteredOrders.filter(
      (o) =>
        o.customerName.toLowerCase().includes(search) ||
        o.phone.includes(search) ||
        o.id.toString().includes(search) ||
        o.publicCode?.toLowerCase().includes(search)
    );
  }, [filteredOrders, orderSearch]);

  // Calcular métricas generales (solo órdenes entregadas)
  const generalMetrics = useMemo(() => {
    const completedOrders = filteredOrders.filter((o) => o.status === "DELIVERED");
    const totalSalesCents = completedOrders.reduce((sum, order) => sum + order.totalCents, 0);
    const totalOrders = completedOrders.length;
    const avgTicketCents = totalOrders > 0 ? totalSalesCents / totalOrders : 0;
    const totalDiscountCents = completedOrders.reduce((sum, order) => sum + order.discountCents, 0);
    const deliveryOrders = completedOrders.filter((o) => o.takeMode === "DELIVERY").length;
    const pickupOrders = completedOrders.filter((o) => o.takeMode === "TAKEAWAY").length;

    // Métricas de cupones
    const ordersWithCoupon = completedOrders.filter((o) => o.couponCode);
    const couponUsageCount = ordersWithCoupon.length;
    const couponTotalDiscount = ordersWithCoupon.reduce((sum, o) => sum + o.discountCents, 0);

    return {
      totalSalesCents,
      totalOrders,
      avgTicketCents,
      totalDiscountCents,
      deliveryOrders,
      pickupOrders,
      couponUsageCount,
      couponTotalDiscount,
    };
  }, [filteredOrders]);

  // Ventas por día (solo órdenes entregadas)
  const dailySales = useMemo(() => {
    const salesByDay = new Map<string, DailySales>();
    filteredOrders
      .filter((o) => o.status === "DELIVERED")
      .forEach((order) => {
        const date = new Date(order.createdAt).toLocaleDateString("es-AR");
        if (!salesByDay.has(date)) {
          salesByDay.set(date, { date, totalCents: 0, ordersCount: 0, avgTicketCents: 0 });
        }
        const daySales = salesByDay.get(date)!;
        daySales.totalCents += order.totalCents;
        daySales.ordersCount += 1;
      });

    salesByDay.forEach((daySales) => {
      daySales.avgTicketCents = daySales.totalCents / daySales.ordersCount;
    });

    const data = Array.from(salesByDay.values());
    switch (dailySalesSort) {
      case "date-asc":
        return data.sort((a, b) => {
          const [dayA, monthA, yearA] = a.date.split("/").map(Number);
          const [dayB, monthB, yearB] = b.date.split("/").map(Number);
          return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
        });
      case "date-desc":
        return data.sort((a, b) => {
          const [dayA, monthA, yearA] = a.date.split("/").map(Number);
          const [dayB, monthB, yearB] = b.date.split("/").map(Number);
          return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime();
        });
      case "total-asc":
        return data.sort((a, b) => a.totalCents - b.totalCents);
      case "total-desc":
        return data.sort((a, b) => b.totalCents - a.totalCents);
      default:
        return data;
    }
  }, [filteredOrders, dailySalesSort]);

  const paginatedDailySales = useMemo(() => {
    const startIndex = (dailySalesPage - 1) * ITEMS_PER_PAGE;
    return dailySales.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [dailySales, dailySalesPage]);

  const totalDailySalesPages = Math.ceil(dailySales.length / ITEMS_PER_PAGE);

  // Paginación de órdenes
  const paginatedOrders = useMemo(() => {
    const startIndex = (ordersPage - 1) * ORDERS_PER_PAGE;
    return searchedOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [searchedOrders, ordersPage]);

  const totalOrdersPages = Math.ceil(searchedOrders.length / ORDERS_PER_PAGE);

  // Top productos (solo órdenes entregadas)
  const topProducts = useMemo(() => {
    const productSales = new Map<string, ProductSales>();
    filteredOrders
      .filter((o) => o.status === "DELIVERED")
      .forEach((order) => {
        order.items.forEach((item) => {
          const productName = item.nameSnapshot;
          if (!productSales.has(productName)) {
            productSales.set(productName, { name: productName, quantity: 0, totalCents: 0 });
          }
          const product = productSales.get(productName)!;
          product.quantity += item.qty;
          product.totalCents += item.lineTotalCents;
        });
      });
    return Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredOrders]);

  const formatCurrency = (value: number) => `$${value.toLocaleString("es-AR")}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      CREATED: "bg-blue-100 text-blue-800",
      CONFIRMED: "bg-yellow-100 text-yellow-800",
      IN_PREP: "bg-orange-100 text-orange-800",
      READY: "bg-green-100 text-green-800",
      DELIVERED: "bg-gray-100 text-gray-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      CREATED: "Creada",
      CONFIRMED: "Confirmada",
      IN_PREP: "En preparación",
      READY: "Lista",
      DELIVERED: "Entregada",
      CANCELLED: "Cancelada",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const parseModifiers = (snapshot: string | undefined): ParsedModifiers | null => {
    if (!snapshot) return null;
    try {
      return JSON.parse(snapshot);
    } catch {
      return null;
    }
  };

  const exportToCSV = () => {
    const headers = [
      "ID", "Fecha", "Cliente", "Teléfono", "Tipo", "Estado",
      "Subtotal", "Descuento", "Cupón", "Propina", "Total", "Items"
    ];

    const rows = filteredOrders
      .filter((o) => o.status === "DELIVERED")
      .map((order) => [
        order.id,
        formatDate(order.createdAt),
        order.customerName,
        order.phone,
        order.takeMode === "DELIVERY" ? "Delivery" : "Retiro",
        order.status,
        formatCurrency(order.subtotalCents),
        formatCurrency(order.discountCents),
        order.couponCode || "-",
        formatCurrency(order.tipCents),
        formatCurrency(order.totalCents),
        order.items.map((i) => `${i.qty}x ${i.nameSnapshot}`).join("; "),
      ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          const cellStr = String(cell);
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Reporte_${dateFrom}_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${rows.length} órdenes exportadas a CSV`, "success");
  };

  const renderOrderDetail = (order: OrderResponse) => {
    const isExpanded = expandedOrderId === order.id;

    return (
      <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden mb-2">
        {/* Header de la orden - clickeable */}
        <div
          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? "bg-gray-50" : "bg-white"}`}
          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-700">#{order.id}</span>
              {getStatusBadge(order.status)}
              {order.couponCode && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  🎟️ {order.couponCode}
                </span>
              )}
              {order.discountCents > 0 && !order.couponCode && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  🏷️ Descuento
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">{formatDate(order.createdAt)}</span>
              <span className="font-bold text-green-600">{formatCurrency(order.totalCents)}</span>
              <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
            <span>👤 {order.customerName}</span>
            <span>📱 {order.phone}</span>
            <span>{order.takeMode === "DELIVERY" ? "🚚 Delivery" : "🏪 Retiro"}</span>
          </div>
        </div>

        {/* Detalle expandido */}
        {isExpanded && (
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Items de la orden */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">📦 Items del pedido</h4>
                <div className="space-y-2">
                  {order.items.map((item, idx) => {
                    const mods = parseModifiers(item.modifiersSnapshot);
                    return (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">{item.qty}x {item.nameSnapshot}</span>
                            {mods?.isCombo && (
                              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">COMBO</span>
                            )}
                          </div>
                          <span className="font-semibold text-green-600">{formatCurrency(item.lineTotalCents)}</span>
                        </div>

                        {/* Detalles de modificadores */}
                        {mods && (
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            {mods.isCombo && mods.items && (
                              <div className="text-xs">
                                <span className="text-gray-500">Incluye: </span>
                                {mods.items.map((i) => `${i.qty}x ${i.productName}`).join(", ")}
                              </div>
                            )}
                            {mods.size && <div className="text-xs">Tamaño: <span className="capitalize">{mods.size}</span></div>}
                            {mods.complementos && mods.complementos.length > 0 && (
                              <div className="text-xs">+ {mods.complementos.map((c) => c.name).join(", ")}</div>
                            )}
                            {mods.aderezos && mods.aderezos.length > 0 && (
                              <div className="text-xs">+ {mods.aderezos.map((a) => a.name).join(", ")}</div>
                            )}
                            {mods.extras && mods.extras.length > 0 && (
                              <div className="text-xs">+ {mods.extras.map((e) => e.name).join(", ")}</div>
                            )}
                            {mods.bebidas && <div className="text-xs">+ {mods.bebidas.name}</div>}
                            {mods.notes && <div className="text-xs italic text-gray-500">Nota: {mods.notes}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumen financiero */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">💰 Resumen</h4>
                <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(order.subtotalCents)}</span>
                  </div>

                  {order.discountCents > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>
                        Descuento
                        {order.couponCode && (
                          <span className="ml-1 text-xs">
                            ({order.couponCode} - {order.couponType === "PERCENT" ? `${order.couponValue}%` : formatCurrency(order.couponValue || 0)})
                          </span>
                        )}
                      </span>
                      <span>-{formatCurrency(order.discountCents)}</span>
                    </div>
                  )}

                  {order.tipCents > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Propina</span>
                      <span>{formatCurrency(order.tipCents)}</span>
                    </div>
                  )}

                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(order.totalCents)}</span>
                  </div>
                </div>

                {/* Info adicional */}
                {(order.address || order.note) && (
                  <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200 space-y-2 text-sm">
                    {order.address && (
                      <div>
                        <span className="text-gray-500">📍 Dirección: </span>
                        <span>{order.address}</span>
                      </div>
                    )}
                    {order.note && (
                      <div>
                        <span className="text-gray-500">📝 Nota: </span>
                        <span className="italic">{order.note}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">Cargando reportes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📊 Reportes y Estadísticas</h1>
          <p className="text-gray-600 mt-2">Análisis detallado de ventas, órdenes y promociones</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <button
            onClick={() => { fetchOrders(); showToast("Datos actualizados", "success"); }}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <span className="text-xl">🔄</span>
            <span className="font-semibold">Actualizar</span>
          </button>
          <button
            onClick={exportToCSV}
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <span className="text-xl">📥</span>
            <span className="font-semibold">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-800 mb-3">📅 Período de análisis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                setDateTo(today.toISOString().split("T")[0]);
                setDateFrom(lastMonth.toISOString().split("T")[0]);
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Último mes
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                setDateTo(today.toISOString().split("T")[0]);
                setDateFrom(lastWeek.toISOString().split("T")[0]);
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Última semana
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: "resumen", label: "📈 Resumen", icon: "📈" },
              { id: "ordenes", label: "📋 Órdenes", icon: "📋" },
              { id: "productos", label: "🏆 Productos", icon: "🏆" },
              { id: "caja", label: "💰 Caja / Salón", icon: "💰" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 md:p-6">
          {/* TAB: Resumen */}
          {activeTab === "resumen" && (
            <div className="space-y-6">
              {/* Métricas principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium opacity-90">Ventas Totales</h3>
                    <span className="text-2xl">💰</span>
                  </div>
                  <p className="text-3xl font-bold">{formatCurrency(generalMetrics.totalSalesCents)}</p>
                  <p className="text-xs opacity-75 mt-2">{generalMetrics.totalOrders} órdenes completadas</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium opacity-90">Ticket Promedio</h3>
                    <span className="text-2xl">🎫</span>
                  </div>
                  <p className="text-3xl font-bold">{formatCurrency(generalMetrics.avgTicketCents)}</p>
                  <p className="text-xs opacity-75 mt-2">Por orden completada</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium opacity-90">Cupones Usados</h3>
                    <span className="text-2xl">🎟️</span>
                  </div>
                  <p className="text-3xl font-bold">{generalMetrics.couponUsageCount}</p>
                  <p className="text-xs opacity-75 mt-2">{formatCurrency(generalMetrics.couponTotalDiscount)} en descuentos</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium opacity-90">Delivery vs Retiro</h3>
                    <span className="text-2xl">🚚</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg"><span className="font-bold">{generalMetrics.deliveryOrders}</span> Delivery</p>
                    <p className="text-lg"><span className="font-bold">{generalMetrics.pickupOrders}</span> Retiro</p>
                  </div>
                </div>
              </div>

              {/* Ventas por día */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <h3 className="font-semibold text-gray-800">📈 Ventas por Día</h3>
                  <select
                    value={dailySalesSort}
                    onChange={(e) => setDailySalesSort(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="date-desc">Fecha (Más nuevo)</option>
                    <option value="date-asc">Fecha (Más viejo)</option>
                    <option value="total-desc">Ventas (Mayor)</option>
                    <option value="total-asc">Ventas (Menor)</option>
                  </select>
                </div>

                {dailySales.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No hay datos para el período</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg overflow-hidden">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Órdenes</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ventas</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket Prom.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paginatedDailySales.map((day) => (
                            <tr key={day.date} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{day.date}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{day.ordersCount}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600">{formatCurrency(day.totalCents)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(day.avgTicketCents)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalDailySalesPages > 1 && (
                      <div className="flex justify-center gap-2 mt-4">
                        <button
                          disabled={dailySalesPage === 1}
                          onClick={() => setDailySalesPage((p) => p - 1)}
                          className="px-3 py-1 rounded border disabled:opacity-50"
                        >
                          ◀
                        </button>
                        <span className="px-3 py-1">{dailySalesPage} / {totalDailySalesPages}</span>
                        <button
                          disabled={dailySalesPage === totalDailySalesPages}
                          onClick={() => setDailySalesPage((p) => p + 1)}
                          className="px-3 py-1 rounded border disabled:opacity-50"
                        >
                          ▶
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB: Órdenes */}
          {activeTab === "ordenes" && (
            <div className="space-y-4">
              {/* Búsqueda */}
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono, ID o código..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">
                  {searchedOrders.length} órdenes encontradas
                </span>
              </div>

              {/* Lista de órdenes */}
              {paginatedOrders.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay órdenes para mostrar</p>
              ) : (
                <div className="space-y-2">
                  {paginatedOrders.map(renderOrderDetail)}
                </div>
              )}

              {/* Paginación */}
              {totalOrdersPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    disabled={ordersPage === 1}
                    onClick={() => setOrdersPage((p) => p - 1)}
                    className="px-4 py-2 rounded border disabled:opacity-50 hover:bg-gray-50"
                  >
                    ◀ Anterior
                  </button>
                  <span className="px-4 py-2">Página {ordersPage} de {totalOrdersPages}</span>
                  <button
                    disabled={ordersPage === totalOrdersPages}
                    onClick={() => setOrdersPage((p) => p + 1)}
                    className="px-4 py-2 rounded border disabled:opacity-50 hover:bg-gray-50"
                  >
                    Siguiente ▶
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: Caja / Salón */}
          {activeTab === "caja" && <CajaPage />}

          {/* TAB: Productos */}
          {activeTab === "productos" && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">🏆 Top 10 Productos Más Vendidos</h3>
              {topProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay datos para el período</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 text-white font-bold text-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-500">{product.quantity} unidades vendidas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{formatCurrency(product.totalCents)}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(product.totalCents / product.quantity)} c/u</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsManager;
