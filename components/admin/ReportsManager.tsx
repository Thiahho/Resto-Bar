import React, { useState, useEffect, useMemo } from "react";
import { useOrders } from "../../hooks/useOrders";
import { useToast } from "../../contexts/ToastContext";
import { OrderResponse } from "../../types";

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
  const { orders, loading } = useOrders();
  const { showToast } = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Inicializar fechas (último mes por defecto)
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    setDateTo(today.toISOString().split("T")[0]);
    setDateFrom(lastMonth.toISOString().split("T")[0]);
  }, []);

  // Filtrar órdenes por fecha
  const filteredOrders = useMemo(() => {
    if (!dateFrom || !dateTo) return orders;

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999); // Incluir todo el día

      return orderDate >= from && orderDate <= to;
    });
  }, [orders, dateFrom, dateTo]);

  // Calcular métricas generales
  const generalMetrics = useMemo(() => {
    const completedOrders = filteredOrders.filter(
      (o) => o.status !== "CANCELLED"
    );

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

  // Ventas por día
  const dailySales = useMemo(() => {
    const salesByDay = new Map<string, DailySales>();

    filteredOrders
      .filter((o) => o.status !== "CANCELLED")
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

    return Array.from(salesByDay.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredOrders]);

  // Top productos
  const topProducts = useMemo(() => {
    const productSales = new Map<string, ProductSales>();

    filteredOrders
      .filter((o) => o.status !== "CANCELLED")
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

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

    // Generar las filas
    const rows = filteredOrders
      .filter((o) => o.status !== "CANCELLED")
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            📊 Reportes y Estadísticas
          </h1>
          <p className="text-gray-600 mt-2">
            Análisis de ventas y productos más vendidos
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
          title="Exportar datos del período a CSV"
        >
          <span className="text-xl">📊</span>
          <span className="font-semibold">Exportar CSV</span>
        </button>
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
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Último mes
            </button>
          </div>
        </div>
      </div>

      {/* Métricas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de ventas */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
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
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
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
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
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
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
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
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 text-lg">
            📈 Ventas por Día
          </h3>
        </div>
        <div className="p-6">
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
                  {/* Total */}
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
      </div>

      {/* Top productos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 text-lg">
            🏆 Top 10 Productos Más Vendidos
          </h3>
        </div>
        <div className="p-6">
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
