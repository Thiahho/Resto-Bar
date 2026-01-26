import React, { useState, useEffect, useMemo } from "react";
import { useOrders } from "../../hooks/useOrders";
import { useToast } from "../../contexts/ToastContext";

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

  // Estados para paginación y ordenamiento de ventas por día
  const [dailySalesPage, setDailySalesPage] = useState(1);
  const [dailySalesSort, setDailySalesSort] = useState<"date-asc" | "date-desc" | "total-asc" | "total-desc">("date-desc");
  const ITEMS_PER_PAGE = 10;

  // Inicializar fechas (último mes por defecto) - solo al montar
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
  }, [dateFrom, dateTo, dailySalesSort]);

  // Filtrar órdenes por fecha
  const filteredOrders = useMemo(() => {
    if (!dateFrom || !dateTo) return orders;

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      // Usar solo la parte de la fecha (sin hora) para comparar
      const orderDateStr = orderDate.toLocaleDateString("en-CA"); // formato YYYY-MM-DD
      return orderDateStr >= dateFrom && orderDateStr <= dateTo;
    });
  }, [orders, dateFrom, dateTo]);

  // Calcular métricas generales (solo órdenes entregadas)
  const generalMetrics = useMemo(() => {
    //console.log("Estados de órdenes:", filteredOrders.map(o => ({ id: o.id, status: o.status })));
    const completedOrders = filteredOrders.filter(
      (o) => o.status === "DELIVERED"
    );
    //console.log("Órdenes DELIVERED:", completedOrders.length);

    const totalSalesCents = completedOrders.reduce(
      (sum, order) => sum + order.totalCents,
      0
    );

    const totalOrders = completedOrders.length;
    const avgTicketCents = totalOrders > 0 ? totalSalesCents / totalOrders : 0;

    const totalDiscountCents = completedOrders.reduce(
      (sum, order) => sum + order.discountCents,
      0
    );

    const deliveryOrders = completedOrders.filter(
      (o) => o.takeMode === "DELIVERY"
    ).length;
    const pickupOrders = completedOrders.filter(
      (o) => o.takeMode === "TAKEAWAY"
    ).length;

    return {
      totalSalesCents,
      totalOrders,
      avgTicketCents,
      totalDiscountCents,
      deliveryOrders,
      pickupOrders,
    };
  }, [filteredOrders]);

  // Ventas por día (solo órdenes entregadas)
  // Ventas por día (solo órdenes entregadas)
  const dailySales = useMemo(() => {
    const salesByDay = new Map<string, DailySales>();

    filteredOrders
      .filter((o) => o.status === "DELIVERED")
      .forEach((order) => {
        const date = new Date(order.createdAt).toLocaleDateString("es-AR");

        if (!salesByDay.has(date)) {
          salesByDay.set(date, {
            date,
            totalCents: 0,
            ordersCount: 0,
            avgTicketCents: 0,
          });
        }

        const daySales = salesByDay.get(date)!;
        daySales.totalCents += order.totalCents;
        daySales.ordersCount += 1;
      });

    // Calcular promedio
    salesByDay.forEach((daySales) => {
      daySales.avgTicketCents = daySales.totalCents / daySales.ordersCount;
    });

    // Ordenar según el filtro seleccionado
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

  // Paginación de ventas por día
  const paginatedDailySales = useMemo(() => {
    const startIndex = (dailySalesPage - 1) * ITEMS_PER_PAGE;
    return dailySales.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [dailySales, dailySalesPage]);

  const totalDailySalesPages = Math.ceil(dailySales.length / ITEMS_PER_PAGE);

  // Top productos (solo órdenes entregadas)
  const topProducts = useMemo(() => {
    const productSales = new Map<string, ProductSales>();

    filteredOrders
      .filter((o) => o.status === "DELIVERED")
      .forEach((order) => {
        order.items.forEach((item) => {
          const productName = item.nameSnapshot;

          if (!productSales.has(productName)) {
            productSales.set(productName, {
              name: productName,
              quantity: 0,
              totalCents: 0,
            });
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

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("es-AR")}`;
  };

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

  const exportToCSV = () => {
    // Definir las columnas del CSV
    const headers = [
      "ID",
      "Fecha",
      "Cliente",
      "Teléfono",
      "Canal",
      "Tipo",
      "Estado",
      "Dirección",
      "Subtotal",
      "Descuento",
      "Total",
    ];

    // Generar las filas (solo órdenes entregadas)
    const rows = filteredOrders
      .filter((o) => o.status === "DELIVERED")
      .map((order) => {
        return [
          order.id,
          formatDate(order.createdAt),
          order.customerName,
          order.phone,
          order.channel,
          order.takeMode === "DELIVERY" ? "Delivery" : "Retiro",
          order.status,
          order.address || "",
          formatCurrency(order.subtotalCents),
          formatCurrency(order.discountCents),
          formatCurrency(order.totalCents),
        ];
      });

    // Convertir a CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            if (
              cellStr.includes(",") ||
              cellStr.includes('"') ||
              cellStr.includes("\n")
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",")
      ),
    ].join("\n");

    // Crear blob y descargar
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_${dateFrom}_${dateTo}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`${rows.length} órdenes exportadas a CSV`, "success");
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
          <h1 className="text-3xl font-bold text-gray-800">
            📊 Reportes y Estadísticas
          </h1>
          <p className="text-gray-600 mt-2">
            Análisis de ventas y productos más vendidos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              fetchOrders();
              showToast("Datos actualizados", "success");
            }}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
            title="Recargar datos"
          >
            <span className="text-xl">🔄</span>
            <span className="font-semibold">Actualizar</span>
          </button>
          <button
            onClick={exportToCSV}
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
            title="Exportar datos del período a CSV"
          >
            <span className="text-xl">📊</span>
            <span className="font-semibold">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-800 mb-3">
          📅 Período de análisis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                setDateTo(today.toISOString().split("T")[0]);
                setDateFrom(lastMonth.toISOString().split("T")[0]);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Último mes
            </button>
          </div>
        </div>
      </div>

      {/* Métricas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de ventas */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Ventas Totales</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(generalMetrics.totalSalesCents)}
          </p>
          <p className="text-xs opacity-75 mt-2">
            {generalMetrics.totalOrders} órdenes completadas
          </p>
        </div>

        {/* Ticket promedio */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Ticket Promedio</h3>
            <span className="text-2xl">🎫</span>
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(generalMetrics.avgTicketCents)}
          </p>
          <p className="text-xs opacity-75 mt-2">Por orden completada</p>
        </div>

        {/* Descuentos aplicados */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Descuentos</h3>
            <span className="text-2xl">🎟️</span>
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(generalMetrics.totalDiscountCents)}
          </p>
          <p className="text-xs opacity-75 mt-2">En cupones aplicados</p>
        </div>

        {/* Delivery vs Pickup */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Tipo de Orden</h3>
            <span className="text-2xl">🚚</span>
          </div>
          <div className="space-y-1">
            <p className="text-lg">
              <span className="font-bold">{generalMetrics.deliveryOrders}</span>{" "}
              Delivery
            </p>
            <p className="text-lg">
              <span className="font-bold">{generalMetrics.pickupOrders}</span>{" "}
              Retiro
            </p>
          </div>
        </div>
      </div>

      {/* Ventas por día */}
      {/* <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 text-lg">
            📈 Ventas por Día
          </h3>
        </div>
        <div className="p-4 md:p-6">
          {dailySales.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay datos para el período seleccionado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Órdenes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ventas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ticket Promedio
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailySales.map((day) => (
                    <tr key={day.date} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {day.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {day.ordersCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {formatCurrency(day.totalCents)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(day.avgTicketCents)}
                      </td>
                    </tr>
                  ))}
                  {/* Total *
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      TOTAL
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dailySales.reduce(
                        (sum, day) => sum + day.ordersCount,
                        0
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(
                        dailySales.reduce((sum, day) => sum + day.totalCents, 0)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(generalMetrics.avgTicketCents)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div> */}

{/* MOBILE: cards */}
<div className="space-y-3 md:hidden">
  {paginatedDailySales.map((day) => (
    <div key={day.date} className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Fecha</div>
          <div className="font-semibold text-gray-900">{day.date}</div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">Ventas</div>
          <div className="font-bold text-green-600">
            {formatCurrency(day.totalCents)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
        <div className="bg-gray-50 rounded-md p-3">
          <div className="text-gray-500">Órdenes</div>
          <div className="font-semibold text-gray-900">{day.ordersCount}</div>
        </div>
        <div className="bg-gray-50 rounded-md p-3">
          <div className="text-gray-500">Ticket Prom.</div>
          <div className="font-semibold text-gray-900">
            {formatCurrency(day.avgTicketCents)}
          </div>
        </div>
      </div>
    </div>
  ))}

  {/* Total (mobile) */}
  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
    <div className="flex items-center justify-between">
      <div className="font-bold text-gray-900">TOTAL</div>
      <div className="font-bold text-green-700">
        {formatCurrency(dailySales.reduce((sum, d) => sum + d.totalCents, 0))}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
      <div className="bg-white rounded-md p-3">
        <div className="text-gray-500">Órdenes</div>
        <div className="font-semibold text-gray-900">
          {dailySales.reduce((sum, d) => sum + d.ordersCount, 0)}
        </div>
      </div>
      <div className="bg-white rounded-md p-3">
        <div className="text-gray-500">Ticket Prom.</div>
        <div className="font-semibold text-gray-900">
          {formatCurrency(generalMetrics.avgTicketCents)}
        </div>
      </div>
    </div>
  </div>
</div>

{/* DESKTOP: table */}
<div className="hidden md:block overflow-x-auto">
  <table className="min-w-full">
    {/* tu table actual tal cual */}
  </table>
</div>

      {/* Ventas por día */}
<div className="bg-white rounded-lg shadow">
  <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
    <h3 className="font-semibold text-gray-800 text-lg">📈 Ventas por Día</h3>

    {/* Filtros */}
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-gray-600">Orden:</label>
      <select
        value={dailySalesSort}
        onChange={(e) => setDailySalesSort(e.target.value as any)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="total-desc">Ventas (Mayor → Menor)</option>
        <option value="total-asc">Ventas (Menor → Mayor)</option>
        <option value="date-desc">Fecha (Más nuevo → Más viejo)</option>
        <option value="date-asc">Fecha (Más viejo → Más nuevo)</option>
      </select>

      <div className="text-sm text-gray-500 ml-1">
        Mostrando {Math.min((dailySalesPage - 1) * ITEMS_PER_PAGE + 1, dailySales.length)}-
        {Math.min(dailySalesPage * ITEMS_PER_PAGE, dailySales.length)} de {dailySales.length}
      </div>
    </div>
  </div>

  <div className="p-4 md:p-6">
    {dailySales.length === 0 ? (
      <p className="text-center text-gray-500 py-8">
        No hay datos para el período seleccionado
      </p>
    ) : (
      <>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Órdenes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ventas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ticket Promedio
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {/* IMPORTANT: ahora usamos paginatedDailySales */}
              {paginatedDailySales.map((day) => (
                <tr key={day.date} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {day.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {day.ordersCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatCurrency(day.totalCents)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(day.avgTicketCents)}
                  </td>
                </tr>
              ))}

              {/* Total del período (no de la página) */}
              <tr className="bg-gray-100 font-bold">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  TOTAL
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {dailySales.reduce((sum, d) => sum + d.ordersCount, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  {formatCurrency(dailySales.reduce((sum, d) => sum + d.totalCents, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(generalMetrics.avgTicketCents)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalDailySalesPages > 1 && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
            <div className="text-sm text-gray-600">
              Página <span className="font-semibold">{dailySalesPage}</span> de{" "}
              <span className="font-semibold">{totalDailySalesPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={dailySalesPage === 1}
                onClick={() => setDailySalesPage((p) => Math.max(1, p - 1))}
                className={`w-full sm:w-auto px-3 py-2 rounded-lg text-sm border ${
                  dailySalesPage === 1
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                ◀ Anterior
              </button>

              {/* Números (compacto) */}
              <div className="hidden md:flex items-center gap-1">
                {Array.from({ length: totalDailySalesPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // muestra: primera, última, actual +- 1
                    return (
                      p === 1 ||
                      p === totalDailySalesPages ||
                      Math.abs(p - dailySalesPage) <= 1
                    );
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const gap = prev && p - prev > 1;

                    return (
                      <React.Fragment key={p}>
                        {gap && <span className="px-1 text-gray-400">…</span>}
                        <button
                          onClick={() => setDailySalesPage(p)}
                          className={`w-full sm:w-auto px-3 py-2 rounded-lg text-sm border ${
                            p === dailySalesPage
                              ? "bg-blue-600 text-white border-blue-600"
                              : "text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                disabled={dailySalesPage === totalDailySalesPages}
                onClick={() =>
                  setDailySalesPage((p) => Math.min(totalDailySalesPages, p + 1))
                }
                className={`w-full sm:w-auto px-3 py-2 rounded-lg text-sm border ${
                  dailySalesPage === totalDailySalesPages
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        )}
      </>
    )}
  </div>
</div>


      {/* Top productos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 text-lg">
            🏆 Top 10 Productos Más Vendidos
          </h3>
        </div>
        <div className="p-4 md:p-6">
          {topProducts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay datos para el período seleccionado
            </p>
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
                      <h4 className="font-semibold text-gray-900">
                        {product.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {product.quantity} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(product.totalCents)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(product.totalCents / product.quantity)}{" "}
                      c/u
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsManager;
