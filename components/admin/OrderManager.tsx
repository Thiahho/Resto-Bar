import React, { useState } from "react";
import { useOrders } from "../../hooks/useOrders";
import { useToast } from "../../contexts/ToastContext";
import { OrderResponse } from "../../types";
import jsPDF from "jspdf";

const ORDER_STATUSES = [
  { value: "CREATED", label: "Creada", color: "bg-blue-500" },
  { value: "CONFIRMED", label: "Confirmada", color: "bg-yellow-500" },
  { value: "IN_PREP", label: "Preparando", color: "bg-orange-500" },
  { value: "READY", label: "Lista", color: "bg-green-500" },
  { value: "DELIVERED", label: "Entregada", color: "bg-gray-500" },
  { value: "CANCELLED", label: "Cancelada", color: "bg-red-500" },
];

const OrderManager: React.FC = () => {
  const {
    orders,
    loading,
    error,
    updateOrderStatus,
    deleteOrder,
    fetchOrders,
  } = useOrders();
  const { showToast, showConfirm } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null
  );
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const filteredOrders = orders.filter((order) => {
    // Filtrar por estado
    const matchesStatus =
      filterStatus === "ALL" || order.status === filterStatus;

    // Filtrar por búsqueda (teléfono o ID)
    const matchesSearch =
      searchQuery === "" ||
      order.phone.includes(searchQuery) ||
      order.id.toString().includes(searchQuery) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const getStatusInfo = (status: string) => {
    return ORDER_STATUSES.find((s) => s.value === status) || ORDER_STATUSES[0];
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    const success = await updateOrderStatus(orderId, newStatus);
    if (success) {
      showToast(
        `Estado actualizado a ${getStatusInfo(newStatus).label}`,
        "success"
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } else {
      showToast("Error al actualizar el estado", "error");
    }
  };

  const handleDelete = (order: OrderResponse) => {
    showConfirm(`¿Eliminar orden #${order.id}?`, async () => {
      const success = await deleteOrder(order.id);
      if (success) {
        showToast("Orden eliminada", "success");
        setIsDetailModalOpen(false);
        setSelectedOrder(null);
      } else {
        showToast("Error al eliminar", "error");
      }
    });
  };

  const openDetailModal = (order: OrderResponse) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedOrder(null);
  };

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

  const generateWhatsAppMessage = (order: OrderResponse) => {
    const statusInfo = getStatusInfo(order.status);
    let message = `🍔 *Pedido #${order.id}*\n\n`;
    message += `👤 *Cliente:* ${order.customerName}\n`;
    message += `📞 *Teléfono:* ${order.phone}\n`;
    message += `📦 *Estado:* ${statusInfo.label}\n`;
    message += `🚚 *Tipo:* ${
      order.takeMode === "DELIVERY" ? "Delivery" : "Retiro en local"
    }\n\n`;

    if (order.address) {
      message += `📍 *Dirección:* ${order.address}\n`;
    }
    if (order.reference) {
      message += `🏠 *Referencia:* ${order.reference}\n`;
    }
    if (order.scheduledAt) {
      message += `📅 *Entrega programada:* ${formatDate(order.scheduledAt)}\n`;
    }
    message += `\n`;

    message += `*🍔 Items del pedido:*\n`;
    order.items.forEach((item, index) => {
      message += `\n${index + 1}. *${item.nameSnapshot}* x${item.qty}\n`;
      message += `   💰 ${formatCurrency(item.lineTotalCents)}\n`;

      // Agregar modificadores si existen
      try {
        if (item.modifiersSnapshot) {
          const modifiers = JSON.parse(item.modifiersSnapshot);

          // Si es un combo, mostrar items del combo
          if (modifiers.isCombo) {
            message += `   🎁 *COMBO ESPECIAL*\n`;
            if (modifiers.items && modifiers.items.length > 0) {
              modifiers.items.forEach((comboItem: any) => {
                message += `   • ${comboItem.qty}x ${comboItem.productName}\n`;
              });
            }
          } else {
            // Si es un producto normal, mostrar modificadores
            if (modifiers.size) {
              message += `   • Tamaño: ${modifiers.size}\n`;
            }
            if (modifiers.complementos && modifiers.complementos.length > 0) {
              message += `   • Complementos: ${modifiers.complementos
                .map((c: any) => c.name)
                .join(", ")}\n`;
            }
            if (modifiers.aderezos && modifiers.aderezos.length > 0) {
              message += `   • Aderezos: ${modifiers.aderezos
                .map((a: any) => a.name)
                .join(", ")}\n`;
            }
            if (modifiers.extras && modifiers.extras.length > 0) {
              message += `   • Extras: ${modifiers.extras
                .map((e: any) => e.name)
                .join(", ")}\n`;
            }
            if (modifiers.bebidas) {
              message += `   • Bebida: ${modifiers.bebidas.name}\n`;
            }
            if (modifiers.notes) {
              message += `   📝 Nota: ${modifiers.notes}\n`;
            }
          }
        }
      } catch (e) {
        // console.error("Error parsing modifiers for WhatsApp:", e);
      }
    });

    message += `\n━━━━━━━━━━━━━━━━\n`;
    message += `💵 *Subtotal:* ${formatCurrency(order.subtotalCents)}\n`;
    if (order.discountCents > 0) {
      message += `🎟️ *Descuento:* -${formatCurrency(order.discountCents)}\n`;
    }
    if (order.tipCents > 0) {
      message += `🙏 *Propina:* ${formatCurrency(order.tipCents)}\n`;
    }
    message += `💰 *TOTAL:* ${formatCurrency(order.totalCents)}\n`;

    if (order.note) {
      message += `\n📝 *Nota del cliente:* ${order.note}\n`;
    }

    message += `\n🕐 *Fecha:* ${formatDate(order.createdAt)}`;

    return encodeURIComponent(message);
  };

  const sendWhatsApp = (order: OrderResponse) => {
    const message = generateWhatsAppMessage(order);
    let phone = order.phone.replace(/\D/g, ""); // Remover caracteres no numéricos

    // Agregar código de país de Argentina (+54) si no lo tiene
    if (!phone.startsWith("54")) {
      phone = "54" + phone;
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  const exportToCSV = (ordersToExport: OrderResponse[] = filteredOrders) => {
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
      "Referencia",
      "Entrega Programada",
      "Items",
      "Cantidad Total",
      "Subtotal",
      "Descuento",
      "Propina",
      "Total",
      "Notas",
    ];

    // Generar las filas
    const rows = ordersToExport.map((order) => {
      const statusInfo = getStatusInfo(order.status);

      // Concatenar items
      const itemsText = order.items
        .map((item) => {
          let itemStr = `${item.qty}x ${item.nameSnapshot}`;

          // Agregar modificadores si existen
          try {
            if (item.modifiersSnapshot) {
              const modifiers = JSON.parse(item.modifiersSnapshot);

              // Si es un combo
              if (modifiers.isCombo) {
                const comboItems =
                  modifiers.items
                    ?.map((ci: any) => `${ci.qty}x ${ci.productName}`)
                    .join(", ") || "";
                itemStr += ` [COMBO: ${comboItems}]`;
              } else {
                // Si es un producto normal
                const mods = [];
                if (modifiers.size) mods.push(`Tamaño: ${modifiers.size}`);
                if (modifiers.complementos?.length)
                  mods.push(
                    `Complementos: ${modifiers.complementos
                      .map((c: any) => c.name)
                      .join(", ")}`
                  );
                if (modifiers.aderezos?.length)
                  mods.push(
                    `Aderezos: ${modifiers.aderezos
                      .map((a: any) => a.name)
                      .join(", ")}`
                  );
                if (modifiers.extras?.length)
                  mods.push(
                    `Extras: ${modifiers.extras
                      .map((e: any) => e.name)
                      .join(", ")}`
                  );
                if (modifiers.bebidas)
                  mods.push(`Bebida: ${modifiers.bebidas.name}`);

                if (mods.length > 0) {
                  itemStr += ` (${mods.join("; ")})`;
                }
              }
            }
          } catch (e) {
            // console.error("Error parsing modifiers for CSV:", e);
          }

          return itemStr;
        })
        .join(" | ");

      const totalQty = order.items.reduce((sum, item) => sum + item.qty, 0);

      return [
        order.id,
        formatDate(order.createdAt),
        order.customerName,
        order.phone,
        order.channel,
        order.takeMode === "DELIVERY" ? "Delivery" : "Retiro",
        statusInfo.label,
        order.address || "",
        order.reference || "",
        order.scheduledAt ? formatDate(order.scheduledAt) : "",
        itemsText,
        totalQty,
        formatCurrency(order.subtotalCents),
        formatCurrency(order.discountCents),
        formatCurrency(order.tipCents),
        formatCurrency(order.totalCents),
        order.note || "",
      ];
    });

    // Convertir a CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            // Escapar comillas y comas
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

    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `Ordenes_${today}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`${ordersToExport.length} órdenes exportadas a CSV`, "success");
  };

  const generatePDF = (order: OrderResponse) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 297], // Ancho de ticket térmico (80mm)
    });

    const statusInfo = getStatusInfo(order.status);
    let yPos = 10;
    const leftMargin = 5;
    const pageWidth = 80;
    const contentWidth = pageWidth - leftMargin * 2;

    // Función helper para texto centrado
    const addCenteredText = (
      text: string,
      y: number,
      fontSize: number = 10,
      isBold: boolean = false
    ) => {
      doc.setFontSize(fontSize);
      if (isBold) doc.setFont("helvetica", "bold");
      else doc.setFont("helvetica", "normal");
      const textWidth = doc.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      doc.text(text, x, y);
    };

    // Función helper para línea separadora
    const addLine = (y: number) => {
      doc.setLineWidth(0.1);
      doc.line(leftMargin, y, pageWidth - leftMargin, y);
    };

    // Header - Nombre del negocio
    addCenteredText("BURGER SHOP", yPos, 16, true);
    yPos += 6;
    addCenteredText("Pedido de Delivery", yPos, 10);
    yPos += 5;
    addLine(yPos);
    yPos += 5;

    // Número de orden y estado
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    addCenteredText(`ORDEN #${order.id}`, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    addCenteredText(`Estado: ${statusInfo.label}`, yPos);
    yPos += 5;
    addLine(yPos);
    yPos += 5;

    // Información del cliente
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL CLIENTE", leftMargin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${order.customerName}`, leftMargin, yPos);
    yPos += 4;
    doc.text(`Telefono: ${order.phone}`, leftMargin, yPos);
    yPos += 4;
    doc.text(
      `Tipo: ${order.takeMode === "DELIVERY" ? "Delivery" : "Retiro"}`,
      leftMargin,
      yPos
    );
    yPos += 4;

    if (order.address) {
      doc.text("Direccion:", leftMargin, yPos);
      yPos += 4;
      // Dividir dirección larga
      const addressLines = doc.splitTextToSize(order.address, contentWidth);
      doc.text(addressLines, leftMargin + 2, yPos);
      yPos += addressLines.length * 4;
    }

    if (order.reference) {
      doc.text(`Referencia: ${order.reference}`, leftMargin, yPos);
      yPos += 4;
    }

    if (order.scheduledAt) {
      doc.setFont("helvetica", "bold");
      doc.text("Entrega programada:", leftMargin, yPos);
      yPos += 4;
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(order.scheduledAt), leftMargin + 2, yPos);
      yPos += 4;
    }

    yPos += 1;
    addLine(yPos);
    yPos += 5;

    // Items
    doc.setFont("helvetica", "bold");
    doc.text("ITEMS DEL PEDIDO", leftMargin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");

    order.items.forEach((item, index) => {
      // Nombre del producto
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${item.nameSnapshot}`, leftMargin, yPos);
      yPos += 4;

      // Cantidad y precio
      doc.setFont("helvetica", "normal");
      doc.text(
        `   ${item.qty} x ${formatCurrency(item.unitPriceCents)}`,
        leftMargin,
        yPos
      );
      doc.text(
        formatCurrency(item.lineTotalCents),
        pageWidth -
          leftMargin -
          doc.getTextWidth(formatCurrency(item.lineTotalCents)),
        yPos
      );
      yPos += 4;

      // Modificadores
      try {
        if (item.modifiersSnapshot) {
          const modifiers = JSON.parse(item.modifiersSnapshot);
          doc.setFontSize(7);

          // Si es un combo, mostrar items del combo
          if (modifiers.isCombo) {
            doc.setFont("helvetica", "bold");
            doc.text("   COMBO ESPECIAL", leftMargin + 2, yPos);
            yPos += 3;
            doc.setFont("helvetica", "normal");

            if (modifiers.items && modifiers.items.length > 0) {
              modifiers.items.forEach((comboItem: any) => {
                doc.text(
                  `   - ${comboItem.qty}x ${comboItem.productName}`,
                  leftMargin + 4,
                  yPos
                );
                yPos += 3;
              });
            }
          } else {
            // Si es un producto normal, mostrar modificadores
            if (modifiers.size) {
              doc.text(`   - Tamano: ${modifiers.size}`, leftMargin + 2, yPos);
              yPos += 3;
            }
            if (modifiers.complementos && modifiers.complementos.length > 0) {
              const complementosText = modifiers.complementos
                .map((c: any) => c.name)
                .join(", ");
              const lines = doc.splitTextToSize(
                `   - ${complementosText}`,
                contentWidth - 2
              );
              doc.text(lines, leftMargin + 2, yPos);
              yPos += lines.length * 3;
            }
            if (modifiers.aderezos && modifiers.aderezos.length > 0) {
              const aderezosText = modifiers.aderezos
                .map((a: any) => a.name)
                .join(", ");
              const lines = doc.splitTextToSize(
                `   - ${aderezosText}`,
                contentWidth - 2
              );
              doc.text(lines, leftMargin + 2, yPos);
              yPos += lines.length * 3;
            }
            if (modifiers.extras && modifiers.extras.length > 0) {
              const extrasText = modifiers.extras
                .map((e: any) => e.name)
                .join(", ");
              const lines = doc.splitTextToSize(
                `   - ${extrasText}`,
                contentWidth - 2
              );
              doc.text(lines, leftMargin + 2, yPos);
              yPos += lines.length * 3;
            }
            if (modifiers.bebidas) {
              doc.text(
                `   - Bebida: ${modifiers.bebidas.name}`,
                leftMargin + 2,
                yPos
              );
              yPos += 3;
            }
            if (modifiers.notes) {
              doc.setFont("helvetica", "italic");
              const notesLines = doc.splitTextToSize(
                `   Nota: ${modifiers.notes}`,
                contentWidth - 2
              );
              doc.text(notesLines, leftMargin + 2, yPos);
              yPos += notesLines.length * 3;
              doc.setFont("helvetica", "normal");
            }
          }

          doc.setFontSize(8);
        }
      } catch (e) {
        // console.error("Error parsing modifiers for PDF:", e);
      }

      yPos += 2;
    });

    yPos += 2;
    addLine(yPos);
    yPos += 5;

    // Totales
    doc.setFontSize(9);
    doc.text("Subtotal:", leftMargin, yPos);
    doc.text(
      formatCurrency(order.subtotalCents),
      pageWidth -
        leftMargin -
        doc.getTextWidth(formatCurrency(order.subtotalCents)),
      yPos
    );
    yPos += 5;

    if (order.discountCents > 0) {
      doc.text("Descuento:", leftMargin, yPos);
      doc.text(
        `-${formatCurrency(order.discountCents)}`,
        pageWidth -
          leftMargin -
          doc.getTextWidth(`-${formatCurrency(order.discountCents)}`),
        yPos
      );
      yPos += 5;
    }

    if (order.tipCents > 0) {
      doc.text("Propina:", leftMargin, yPos);
      doc.text(
        formatCurrency(order.tipCents),
        pageWidth -
          leftMargin -
          doc.getTextWidth(formatCurrency(order.tipCents)),
        yPos
      );
      yPos += 5;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL:", leftMargin, yPos);
    doc.text(
      formatCurrency(order.totalCents),
      pageWidth -
        leftMargin -
        doc.getTextWidth(formatCurrency(order.totalCents)),
      yPos
    );
    yPos += 7;

    if (order.note) {
      addLine(yPos);
      yPos += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Nota del cliente:", leftMargin, yPos);
      yPos += 4;
      doc.setFont("helvetica", "italic");
      const noteLines = doc.splitTextToSize(order.note, contentWidth);
      doc.text(noteLines, leftMargin, yPos);
      yPos += noteLines.length * 4;
    }

    yPos += 3;
    addLine(yPos);
    yPos += 5;

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    addCenteredText(`Fecha: ${formatDate(order.createdAt)}`, yPos);
    yPos += 4;
    addCenteredText("Gracias por su compra!", yPos);

    // Guardar PDF
    doc.save(`Ticket_Orden_${order.id}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">Cargando órdenes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gestión de Órdenes</h1>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => exportToCSV()}
            className="flex-1 sm:flex-initial bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            title="Exportar órdenes a CSV"
          >
            <span className="hidden sm:inline">📊 Exportar CSV</span>
            <span className="sm:hidden">📊 CSV</span>
          </button>
          <button
            onClick={fetchOrders}
            className="flex-1 sm:flex-initial bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
          >
            🔄<span className="hidden sm:inline ml-1">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Campo de búsqueda */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Buscar por teléfono, ID o nombre del cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <span className="absolute left-4 top-3.5 text-gray-400 text-xl">
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros por estado */}
        <div className="flex flex-wrap gap-1 sm:gap-2">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
              filterStatus === "ALL"
                ? "bg-gray-800 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Todas ({orders.length})
          </button>
          {ORDER_STATUSES.map((status) => {
            const count = orders.filter(
              (o) => o.status === status.value
            ).length;
            return (
              <button
                key={status.value}
                onClick={() => setFilterStatus(status.value)}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                  filterStatus === status.value
                    ? `${status.color} text-white`
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {status.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Contador de resultados */}
      {searchQuery && filteredOrders.length > 0 && (
        <div className="text-sm text-gray-600 px-2">
          Mostrando {filteredOrders.length} resultado
          {filteredOrders.length !== 1 ? "s" : ""} de {orders.length} orden
          {orders.length !== 1 ? "es" : ""}
        </div>
      )}

      {/* Lista de órdenes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? (
              <>
                <p className="text-lg mb-2">No se encontraron órdenes</p>
                <p className="text-sm">
                  No hay resultados para "{searchQuery}"
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-blue-600 hover:text-blue-800 underline"
                >
                  Limpiar búsqueda
                </button>
              </>
            ) : (
              <>
                No hay órdenes{" "}
                {filterStatus !== "ALL" &&
                  `con estado "${getStatusInfo(filterStatus).label}"`}
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customerName}
                        {order.scheduledAt && (
                          <span
                            className="ml-2 text-xs text-blue-600"
                            title={`Programada para: ${formatDate(
                              order.scheduledAt
                            )}`}
                          >
                            📅
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => sendWhatsApp(order)}
                          className="text-green-600 hover:text-green-800 hover:underline flex items-center gap-1"
                          title="Enviar pedido por WhatsApp"
                        >
                          <span>📱</span>
                          {order.phone}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.takeMode === "DELIVERY"
                          ? "🚚 Delivery"
                          : "🏪 Retiro"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(order.totalCents)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color} text-white`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openDetailModal(order)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => generatePDF(order)}
                          className="text-red-600 hover:text-red-900"
                          title="Descargar ticket PDF"
                        >
                          📄
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                Orden #{selectedOrder.id}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => generatePDF(selectedOrder)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  title="Descargar ticket PDF"
                >
                  <span>📄</span>
                  Descargar PDF
                </button>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Estado actual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado de la orden
                </label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) =>
                    handleStatusChange(selectedOrder.id, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Información del cliente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">
                  📋 Información del Cliente
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Teléfono:</span>
                    <button
                      onClick={() => sendWhatsApp(selectedOrder)}
                      className="font-medium text-green-600 hover:text-green-800 hover:underline flex items-center gap-1"
                      title="Enviar pedido por WhatsApp"
                    >
                      <span>📱</span>
                      {selectedOrder.phone}
                    </button>
                  </div>
                  <div>
                    <span className="text-gray-600">Canal:</span>
                    <p className="font-medium">{selectedOrder.channel}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <p className="font-medium">
                      {selectedOrder.takeMode === "DELIVERY"
                        ? "🚚 Delivery"
                        : "🏪 Retiro"}
                    </p>
                  </div>
                  {selectedOrder.address && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Dirección:</span>
                      <p className="font-medium">{selectedOrder.address}</p>
                    </div>
                  )}
                  {selectedOrder.reference && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Referencia:</span>
                      <p className="font-medium">{selectedOrder.reference}</p>
                    </div>
                  )}
                  {selectedOrder.note && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Nota:</span>
                      <p className="font-medium">{selectedOrder.note}</p>
                    </div>
                  )}
                  {selectedOrder.scheduledAt && (
                    <div className="col-span-2">
                      <span className="text-gray-600">
                        📅 Entrega programada:
                      </span>
                      <p className="font-medium text-blue-600">
                        {formatDate(selectedOrder.scheduledAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items de la orden */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  🍔 Items del Pedido
                </h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => {
                    let modifiersData: any = null;
                    try {
                      if (item.modifiersSnapshot) {
                        modifiersData = JSON.parse(item.modifiersSnapshot);
                        // console.log(`Item ${index} modifiersData:`, modifiersData);
                      }
                    } catch (e) {
                      // console.error("Error parsing modifiers:", e);
                    }

                    // console.log(`Item ${index}:`, { modifiersSnapshot: item.modifiersSnapshot, modifiersTotalCents: item.modifiersTotalCents, modifiersData });

                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {item.qty}x {item.nameSnapshot}
                            </p>

                            {/* Detalles de COMBOS */}
                            {modifiersData && modifiersData.isCombo && (
                              <div className="mt-2 space-y-1 text-sm">
                                <div className="ml-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded p-2 border border-yellow-200">
                                  <p className="font-semibold text-orange-700 mb-1">
                                    🎁 COMBO ESPECIAL
                                  </p>
                                  <div className="space-y-1">
                                    {modifiersData.items?.map(
                                      (comboItem: any, idx: number) => (
                                        <p
                                          key={idx}
                                          className="ml-2 text-xs text-gray-700"
                                        >
                                          • {comboItem.qty}x{" "}
                                          {comboItem.productName}
                                        </p>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Detalles de modificadores */}
                            {modifiersData &&
                              !modifiersData.isCombo &&
                              Object.keys(modifiersData).some((key) => {
                                const value = modifiersData[key];
                                return (
                                  value &&
                                  ((Array.isArray(value) && value.length > 0) ||
                                    (!Array.isArray(value) &&
                                      value !== null &&
                                      key !== "notes" &&
                                      key !== "size"))
                                );
                              }) && (
                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                  {modifiersData.size &&
                                    modifiersData.size !== "simple" && (
                                      <p className="ml-4">
                                        • Tamaño:{" "}
                                        <span className="capitalize font-medium">
                                          {modifiersData.size}
                                        </span>
                                      </p>
                                    )}
                                  {modifiersData.complementos &&
                                    modifiersData.complementos.length > 0 && (
                                      <div className="ml-4">
                                        <p className="font-medium text-gray-700">
                                          • Complementos:
                                        </p>
                                        {(() => {
                                          // Contar cantidades de cada complemento
                                          const counts: Record<
                                            string,
                                            {
                                              name: string;
                                              count: number;
                                              price: number;
                                            }
                                          > = {};
                                          modifiersData.complementos.forEach(
                                            (m: any) => {
                                              if (!counts[m.name]) {
                                                counts[m.name] = {
                                                  name: m.name,
                                                  count: 0,
                                                  price: m.price,
                                                };
                                              }
                                              counts[m.name].count += 1;
                                            }
                                          );
                                          return Object.values(counts).map(
                                            (item, idx) => (
                                              <p
                                                key={idx}
                                                className="ml-4 text-xs"
                                              >
                                                {item.count}x {item.name}{" "}
                                                {item.price > 0 &&
                                                  `(+$${Math.round(
                                                    item.price / 100
                                                  ).toLocaleString("es-AR")})`}
                                              </p>
                                            )
                                          );
                                        })()}
                                      </div>
                                    )}
                                  {modifiersData.aderezos &&
                                    modifiersData.aderezos.length > 0 && (
                                      <div className="ml-4">
                                        <p className="font-medium text-gray-700">
                                          • Aderezos:
                                        </p>
                                        {(() => {
                                          const counts: Record<
                                            string,
                                            {
                                              name: string;
                                              count: number;
                                              price: number;
                                            }
                                          > = {};
                                          modifiersData.aderezos.forEach(
                                            (m: any) => {
                                              if (!counts[m.name]) {
                                                counts[m.name] = {
                                                  name: m.name,
                                                  count: 0,
                                                  price: m.price,
                                                };
                                              }
                                              counts[m.name].count += 1;
                                            }
                                          );
                                          return Object.values(counts).map(
                                            (item, idx) => (
                                              <p
                                                key={idx}
                                                className="ml-4 text-xs"
                                              >
                                                {item.count}x {item.name}{" "}
                                                {item.price > 0 &&
                                                  `(+$${Math.round(
                                                    item.price / 100
                                                  ).toLocaleString("es-AR")})`}
                                              </p>
                                            )
                                          );
                                        })()}
                                      </div>
                                    )}
                                  {modifiersData.extras &&
                                    modifiersData.extras.length > 0 && (
                                      <div className="ml-4">
                                        <p className="font-medium text-gray-700">
                                          • Extras:
                                        </p>
                                        {(() => {
                                          const counts: Record<
                                            string,
                                            {
                                              name: string;
                                              count: number;
                                              price: number;
                                            }
                                          > = {};
                                          modifiersData.extras.forEach(
                                            (m: any) => {
                                              if (!counts[m.name]) {
                                                counts[m.name] = {
                                                  name: m.name,
                                                  count: 0,
                                                  price: m.price,
                                                };
                                              }
                                              counts[m.name].count += 1;
                                            }
                                          );
                                          return Object.values(counts).map(
                                            (item, idx) => (
                                              <p
                                                key={idx}
                                                className="ml-4 text-xs"
                                              >
                                                {item.count}x {item.name}{" "}
                                                {item.price > 0 &&
                                                  `(+$${Math.round(
                                                    item.price / 100
                                                  ).toLocaleString("es-AR")})`}
                                              </p>
                                            )
                                          );
                                        })()}
                                      </div>
                                    )}
                                  {modifiersData.bebidas && (
                                    <p className="ml-4">
                                      • Bebida:{" "}
                                      <span className="font-medium">
                                        {modifiersData.bebidas.name}
                                      </span>{" "}
                                      {modifiersData.bebidas.price > 0 &&
                                        `(+$${Math.round(
                                          modifiersData.bebidas.price / 100
                                        ).toLocaleString("es-AR")})`}
                                    </p>
                                  )}
                                  {modifiersData.notes && (
                                    <p className="ml-4 italic text-gray-700">
                                      📝 {modifiersData.notes}
                                    </p>
                                  )}
                                </div>
                              )}

                            {/* Fallback si hay modificadores pero no hay snapshot detallado */}
                            {item.modifiersTotalCents > 0 && !modifiersData && (
                              <div className="mt-2 text-sm text-gray-600">
                                <p className="ml-4 font-medium">
                                  • Modificadores (sin detalle):
                                </p>
                                <p className="ml-8 text-xs text-orange-600">
                                  Total modificadores:{" "}
                                  {formatCurrency(item.modifiersTotalCents)}
                                </p>
                              </div>
                            )}

                            {/* Debug: Mostrar snapshot raw si no se pudo parsear pero existe */}
                            {item.modifiersSnapshot && !modifiersData && (
                              <div className="mt-2 text-sm bg-yellow-50 p-2 rounded">
                                <p className="text-xs text-yellow-800 font-medium">
                                  ⚠️ Error parseando modificadores
                                </p>
                                <details className="text-xs text-gray-600 mt-1">
                                  <summary className="cursor-pointer">
                                    Ver datos raw
                                  </summary>
                                  <pre className="mt-1 overflow-x-auto">
                                    {item.modifiersSnapshot}
                                  </pre>
                                </details>
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(item.lineTotalCents)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(item.unitPriceCents)} c/u
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totales */}
              <div className="border-t border-gray-200 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedOrder.subtotalCents)}
                    </span>
                  </div>
                  {selectedOrder.discountCents > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento:</span>
                      <span className="font-medium">
                        -{formatCurrency(selectedOrder.discountCents)}
                      </span>
                    </div>
                  )}
                  {selectedOrder.tipCents > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>🙏 Propina:</span>
                      <span className="font-medium">
                        {formatCurrency(selectedOrder.tipCents)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total:</span>
                    <span className="text-primary">
                      {formatCurrency(selectedOrder.totalCents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="text-xs text-gray-500 space-y-1 border-t border-gray-200 pt-4">
                <p>Creada: {formatDate(selectedOrder.createdAt)}</p>
                <p>Actualizada: {formatDate(selectedOrder.updatedAt)}</p>
              </div>

              {/* Botón eliminar */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => handleDelete(selectedOrder)}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  🗑️ Eliminar Orden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManager;
