import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import apiClient from "../../services/api/apiClient";
import { OrderTrackingResponse } from "../../types";

const STATUS_STEPS = [
  { key: "CREATED", label: "Recibido" },
  { key: "CONFIRMED", label: "Confirmado" },
  { key: "IN_PREP", label: "Preparando" },
  { key: "READY", label: "Listo / En camino" },
  { key: "DELIVERED", label: "Entregado" },
  { key: "CANCELLED", label: "Cancelado" },
];

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString("es-AR")}`;
};

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const OrderTrackingPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const query = useQuery();
  const token = query.get("t");
  const [order, setOrder] = useState<OrderTrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let isFirstLoad = true;

    const fetchTracking = async () => {
      if (!code || !token) {
        setError("El link de seguimiento es inválido.");
        setLoading(false);
        return;
      }

      try {
        if (isFirstLoad) {
          setLoading(true);
        }
        const response = await apiClient.get<OrderTrackingResponse>(
          `/api/tracking/${code}?t=${encodeURIComponent(token)}`
        );
        if (isMounted) {
          setOrder(response.data);
          setError(null);
          isFirstLoad = false;
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "No pudimos cargar el seguimiento. Verificá el link."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 30000); // Cada 30 segundos

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [code, token]);

  const currentStepIndex = order
    ? Math.max(
        STATUS_STEPS.findIndex((step) => step.key === order.status),
        0
      )
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Seguimiento del pedido</h1>
          <p className="text-gray-400">
            Consultá el estado actual y el historial de tu pedido.
          </p>
        </header>

        {loading && (
          <div className="bg-gray-900 rounded-xl p-6 text-center">
            Cargando estado del pedido...
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-500 text-red-200 rounded-xl p-6 text-center">
            {error}
          </div>
        )}

        {order && (
          <>
            <section className="bg-gray-900 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-400">Pedido</p>
                  <h2 className="text-xl font-semibold">
                    #{order.orderId} · {order.publicCode}
                  </h2>
                </div>
                <div className="text-sm text-gray-400">
                  Actualizado: {formatDate(order.updatedAt)}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-400">Estado actual</p>
                <div className="flex flex-col gap-1">
                  {STATUS_STEPS.filter(step => {
                    // Si está cancelado, mostrar solo hasta el estado actual + cancelado
                    if (order.status === "CANCELLED") {
                      return step.key === "CANCELLED" ||
                        STATUS_STEPS.findIndex(s => s.key === step.key) < STATUS_STEPS.findIndex(s => s.key === "CANCELLED");
                    }
                    // Si no está cancelado, no mostrar la opción de cancelado
                    return step.key !== "CANCELLED";
                  }).map((step, index, filteredSteps) => {
                    const isCancelled = order.status === "CANCELLED";
                    const isCurrentCancelled = step.key === "CANCELLED" && isCancelled;
                    const isCompleted = isCancelled
                      ? step.key === "CANCELLED" || index < filteredSteps.findIndex(s => s.key === "CANCELLED")
                      : index <= currentStepIndex;
                    const isCurrent = step.key === order.status;
                    const isLast = index === filteredSteps.length - 1;

                    return (
                      <div key={step.key} className="flex items-start gap-3">
                        {/* Línea vertical y círculo/check */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                              isCurrentCancelled
                                ? "bg-red-500 border-red-500"
                                : isCompleted
                                ? "bg-primary border-primary"
                                : "bg-gray-800 border-gray-600"
                            }`}
                          >
                            {isCompleted ? (
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-gray-600" />
                            )}
                          </div>
                          {/* Línea conectora */}
                          {!isLast && (
                            <div
                              className={`w-0.5 h-8 ${
                                isCompleted && !isCurrent
                                  ? isCancelled && step.key !== "CANCELLED"
                                    ? "bg-red-500"
                                    : "bg-primary"
                                  : "bg-gray-700"
                              }`}
                            />
                          )}
                        </div>
                        {/* Texto del estado */}
                        <div className={`pt-1 ${isLast ? "" : "pb-4"}`}>
                          <p
                            className={`font-medium ${
                              isCurrentCancelled
                                ? "text-red-400"
                                : isCurrent
                                ? "text-primary"
                                : isCompleted
                                ? "text-white"
                                : "text-gray-500"
                            }`}
                          >
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className={`text-xs mt-0.5 ${isCurrentCancelled ? "text-red-400/70" : "text-primary/70"}`}>
                              Estado actual
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="bg-gray-900 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold">Detalle del pedido</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>
                  <span className="text-gray-400">Tipo:</span>{" "}
                  {order.takeMode === "DELIVERY" ? "Delivery" : "Retiro"}
                </p>
                {order.address && (
                  <p>
                    <span className="text-gray-400">Dirección:</span>{" "}
                    {order.address}
                  </p>
                )}
                {order.reference && (
                  <p>
                    <span className="text-gray-400">Referencia:</span>{" "}
                    {order.reference}
                  </p>
                )}
                {order.scheduledAt && (
                  <p>
                    <span className="text-gray-400">Programado:</span>{" "}
                    {formatDate(order.scheduledAt)}
                  </p>
                )}
                {order.note && (
                  <p>
                    <span className="text-gray-400">Nota:</span> {order.note}
                  </p>
                )}
              </div>

              <div className="border-t border-gray-800 pt-4 space-y-3">
                {order.items.map((item, index) => (
                  <div
                    key={`${item.nameSnapshot}-${index}`}
                    className="flex justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {item.qty}x {item.nameSnapshot}
                      </p>
                    </div>
                    <div className="text-gray-300">
                      {formatCurrency(item.lineTotalCents)}
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-800 pt-3 text-sm space-y-1">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotalCents)}</span>
                  </div>
                  {order.discountCents > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Descuento</span>
                      <span>-{formatCurrency(order.discountCents)}</span>
                    </div>
                  )}
                  {order.tipCents > 0 && (
                    <div className="flex justify-between text-blue-300">
                      <span>Propina</span>
                      <span>{formatCurrency(order.tipCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(order.totalCents)}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-gray-900 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold">Historial de estados</h3>
              <div className="space-y-3">
                {order.history.length === 0 && (
                  <p className="text-sm text-gray-400">
                    Todavía no hay movimientos registrados.
                  </p>
                )}
                {order.history.map((entry, index) => {
                  const stepLabel =
                    STATUS_STEPS.find((step) => step.key === entry.status)
                      ?.label ?? entry.status;
                  return (
                    <div
                      key={`${entry.status}-${entry.changedAt}-${index}`}
                      className="flex items-start gap-3"
                    >
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium">{stepLabel}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(entry.changedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
