import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import jsPDF from 'jspdf';

interface SessionItem {
  id: number;
  tableId: number;
  tableName?: string;
  customerName?: string;
  guestCount: number;
  openedAt: string;
  closedAt?: string;
  status: string;
  openedByUserName?: string;
  closedByUserName?: string;
  subtotalCents: number;
  tipCents: number;
  totalCents: number;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
  orderCount: number;
}

interface OrderItemDetail {
  id: number;
  nameSnapshot: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  modifiersSnapshot?: string;
}

interface OrderDetail {
  id: number;
  note?: string;
  subtotalCents: number;
  totalCents: number;
  items: OrderItemDetail[];
}

interface SessionDetail {
  id: number;
  tableName?: string;
  customerName?: string;
  guestCount: number;
  openedAt: string;
  closedAt?: string;
  openedByUserName?: string;
  closedByUserName?: string;
  subtotalCents: number;
  tipCents: number;
  totalCents: number;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
  orders: OrderDetail[];
}

interface DailySummary {
  date: string;
  sessions: SessionItem[];
  sessionCount: number;
  totalByCash: number;
  totalByCard: number;
  totalByTransfer: number;
  totalTips: number;
  grandTotal: number;
}

const fmt = (v: number) => `$${Math.round(v).toLocaleString('es-AR')}`;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const formatDuration = (openedAt: string, closedAt?: string) => {
  const start = new Date(openedAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  const mins = Math.floor((end - start) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
};

const PAYMENT_COLORS: Record<string, string> = {
  CASH: 'bg-green-100 text-green-800',
  CARD: 'bg-blue-100 text-blue-800',
  TRANSFER: 'bg-purple-100 text-purple-800',
};

// ── PDF ticket generator ──────────────────────────────────────────────────────
const generateSessionPDF = (session: SessionDetail, businessName: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 297],
  });

  let yPos = 10;
  const leftMargin = 5;
  const pageWidth = 80;
  const contentWidth = pageWidth - leftMargin * 2;

  const addCenteredText = (text: string, y: number, fontSize = 10, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  const addLine = (y: number) => {
    doc.setLineWidth(0.1);
    doc.line(leftMargin, y, pageWidth - leftMargin, y);
  };

  const rightText = (text: string, y: number) => {
    doc.text(text, pageWidth - leftMargin - doc.getTextWidth(text), y);
  };

  // Header
  addCenteredText(businessName, yPos, 16, true);
  yPos += 6;
  addCenteredText('Ticket de Mesa', yPos, 10);
  yPos += 5;
  addLine(yPos);
  yPos += 5;

  // Session info
  const tableName = session.tableName ?? `Mesa #${session.id}`;
  addCenteredText(`MESA: ${tableName}`, yPos, 14, true);
  yPos += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (session.customerName) {
    doc.text(`Cliente: ${session.customerName}`, leftMargin, yPos);
    yPos += 4;
  }
  doc.text(`Comensales: ${session.guestCount}`, leftMargin, yPos);
  yPos += 4;
  if (session.closedAt) {
    doc.text(`Fecha: ${formatDateTime(session.closedAt)}`, leftMargin, yPos);
    yPos += 4;
  }
  yPos += 1;
  addLine(yPos);
  yPos += 5;

  // Items
  doc.setFont('helvetica', 'bold');
  doc.text('ITEMS CONSUMIDOS', leftMargin, yPos);
  yPos += 5;

  session.orders.forEach(order => {
    order.items.forEach(item => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.qty}x ${item.nameSnapshot}`, leftMargin, yPos);
      rightText(fmt(item.lineTotalCents), yPos);
      yPos += 4;

      doc.setFont('helvetica', 'normal');
      doc.text(`   ${item.qty} x ${fmt(item.unitPriceCents)}`, leftMargin, yPos);
      yPos += 4;

      try {
        if (item.modifiersSnapshot) {
          const parsed = JSON.parse(item.modifiersSnapshot);
          if (Array.isArray(parsed) && parsed.length > 0) {
            doc.setFontSize(7);
            parsed.forEach((m: any) => {
              const name = m.name || m.Name || '';
              if (name) {
                const lines = doc.splitTextToSize(`   + ${name}`, contentWidth - 2);
                doc.text(lines, leftMargin + 2, yPos);
                yPos += lines.length * 3;
              }
            });
            doc.setFontSize(8);
          }
        }
      } catch { /* ignore */ }

      yPos += 1;
    });
  });

  yPos += 2;
  addLine(yPos);
  yPos += 5;

  // Totals
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', leftMargin, yPos);
  rightText(fmt(session.subtotalCents), yPos);
  yPos += 5;

  if (session.tipCents > 0) {
    doc.text('Propina:', leftMargin, yPos);
    rightText(fmt(session.tipCents), yPos);
    yPos += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL:', leftMargin, yPos);
  rightText(fmt(session.totalCents), yPos);
  yPos += 7;

  // Payment method
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const payLabel = PAYMENT_LABELS[session.paymentMethod ?? ''] ?? session.paymentMethod ?? '-';
  doc.text(`Pago: ${payLabel}`, leftMargin, yPos);
  yPos += 5;

  addLine(yPos);
  yPos += 5;

  // Footer
  doc.setFontSize(7);
  addCenteredText('Gracias por su visita!', yPos);

  // Open in browser (auto-print dialog)
  doc.autoPrint();
  doc.output('dataurlnewwindow');
};

// ── Main component ────────────────────────────────────────────────────────────
const CajaPage: React.FC = () => {
  const { token } = useAuth();
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [data, setData] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [printingId, setPrintingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/admin/table-sessions?date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || 'Error cargando datos');
    } finally {
      setIsLoading(false);
    }
  }, [date, token]);

  useEffect(() => { load(); }, [load]);

  const handlePrint = async (sessionId: number) => {
    setPrintingId(sessionId);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/admin/table-sessions/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const detail: SessionDetail = await res.json();
      generateSessionPDF(detail, 'Resto Bar');
    } catch (e: any) {
      alert('Error al cargar el ticket: ' + (e.message || 'Error desconocido'));
    } finally {
      setPrintingId(null);
    }
  };

  const toggleExpand = (id: number) =>
    setExpandedId(prev => (prev === id ? null : id));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cierre de Caja</h1>
          <p className="text-sm text-gray-500 mt-1">Sesiones de mesa cerradas por día</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={load}
            disabled={isLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label="Efectivo" value={fmt(data.totalByCash)} color="bg-green-50 border-green-200" textColor="text-green-700" icon="💵" />
            <SummaryCard label="Tarjeta" value={fmt(data.totalByCard)} color="bg-blue-50 border-blue-200" textColor="text-blue-700" icon="💳" />
            <SummaryCard label="Transferencia" value={fmt(data.totalByTransfer)} color="bg-purple-50 border-purple-200" textColor="text-purple-700" icon="📲" />
            <SummaryCard label="Propinas" value={fmt(data.totalTips)} color="bg-yellow-50 border-yellow-200" textColor="text-yellow-700" icon="⭐" />
          </div>

          {/* Grand Total */}
          <div className="bg-gray-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total del día</p>
              <p className="text-3xl font-bold text-white mt-1">{fmt(data.grandTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">{data.sessionCount} mesas cerradas</p>
              <p className="text-gray-300 text-sm mt-1">
                {new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </p>
            </div>
          </div>

          {/* Sessions table */}
          {data.sessions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-semibold">Sin sesiones cerradas este día</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Mesa</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Apertura</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Cierre</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Duración</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Pago</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-semibold">Propina</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-semibold">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.sessions.map(s => (
                    <React.Fragment key={s.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 cursor-pointer" onClick={() => toggleExpand(s.id)}>
                          <p className="font-semibold text-gray-800">{s.tableName ?? `Mesa ${s.tableId}`}</p>
                          {s.customerName && (
                            <p className="text-xs text-gray-500">{s.customerName} · {s.guestCount} pax</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell cursor-pointer" onClick={() => toggleExpand(s.id)}>{formatTime(s.openedAt)}</td>
                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell cursor-pointer" onClick={() => toggleExpand(s.id)}>
                          {s.closedAt ? formatTime(s.closedAt) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell cursor-pointer" onClick={() => toggleExpand(s.id)}>
                          {formatDuration(s.openedAt, s.closedAt)}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell cursor-pointer" onClick={() => toggleExpand(s.id)}>
                          {s.paymentMethod ? (
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PAYMENT_COLORS[s.paymentMethod] ?? 'bg-gray-100 text-gray-700'}`}>
                              {PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-yellow-600 font-medium cursor-pointer" onClick={() => toggleExpand(s.id)}>
                          {s.tipCents > 0 ? fmt(s.tipCents) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800 cursor-pointer" onClick={() => toggleExpand(s.id)}>
                          {fmt(s.totalCents)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handlePrint(s.id)}
                              disabled={printingId === s.id}
                              title="Imprimir ticket"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors disabled:opacity-40"
                            >
                              {printingId === s.id ? (
                                <span className="text-xs">...</span>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              )}
                            </button>
                            <span
                              className="text-gray-400 cursor-pointer px-1"
                              onClick={() => toggleExpand(s.id)}
                            >
                              {expandedId === s.id ? '▲' : '▼'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {expandedId === s.id && (
                        <tr>
                          <td colSpan={8} className="px-4 pb-4 bg-gray-50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                              <DetailField label="Abierta por" value={s.openedByUserName ?? '-'} />
                              <DetailField label="Cerrada por" value={s.closedByUserName ?? '-'} />
                              <DetailField label="Órdenes" value={`${s.orderCount}`} />
                              <DetailField label="Subtotal" value={fmt(s.subtotalCents)} />
                              {s.tipCents > 0 && <DetailField label="Propina" value={fmt(s.tipCents)} />}
                              <DetailField label="Total cobrado" value={fmt(s.totalCents)} />
                              {s.notes && (
                                <div className="col-span-2">
                                  <DetailField label="Notas" value={s.notes} />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {isLoading && !data && (
        <div className="text-center py-16 text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500 mx-auto mb-3"></div>
          <p>Cargando...</p>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string; value: string; color: string; textColor: string; icon: string;
}> = ({ label, value, color, textColor, icon }) => (
  <div className={`rounded-xl border p-4 ${color}`}>
    <div className="flex items-center gap-2 mb-1">
      <span className="text-lg">{icon}</span>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
    <p className={`text-xl font-bold ${textColor}`}>{value}</p>
  </div>
);

const DetailField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-gray-400 uppercase tracking-wide text-xs">{label}</p>
    <p className="font-semibold text-gray-700 mt-0.5">{value}</p>
  </div>
);

export default CajaPage;
