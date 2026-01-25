import React, { useState } from "react";
import { useCart } from "../../contexts/CartContext";
import { OrderType, OrderRequest, CartItem } from "../../types";
import {
  api,
  getProductsImageUrl,
  createOrder,
} from "../../services/api/apiClient";
import { useToast } from "../../contexts/ToastContext";
import ProductDetailModal from "./ProductDetailModal";

const CheckoutModal: React.FC = () => {
  const {
    cart,
    cartTotal,
    isCheckoutOpen,
    closeCheckout,
    updateQuantity,
    clearCart,
  } = useCart();
  const { showToast } = useToast();
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  // const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  //const [reference, setReference] = useState("");
  //const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "transfer" | "split"
  >("cash");
  const [tipAmount, setTipAmount] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountCents: number;
    type: string;
    value: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  if (!isCheckoutOpen) return null;

  const handleValidateCoupon = async () => {
    if (!promoCode.trim()) {
      showToast("Ingresa un código de cupón", "error");
      return;
    }

    setValidatingCoupon(true);
    try {
      const response = await api.post<{
        isValid: boolean;
        errorMessage?: string;
        discountCents: number;
        coupon?: any;
      }>("/api/coupons/validate", {
        code: promoCode.trim(),
        totalCents: Math.round(cartTotal * 100),
      });

      if (response.isValid) {
        setAppliedCoupon({
          code: promoCode.trim().toUpperCase(),
          discountCents: response.discountCents,
          type: response.coupon.type,
          value: response.coupon.value,
        });
        showToast("Cupón aplicado exitosamente", "success");
        setShowPromoInput(false);
      } else {
        showToast(response.errorMessage || "Cupón inválido", "error");
      }
    } catch (error: any) {
      showToast(error.message || "Error al validar cupón", "error");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setPromoCode("");
  };

  const calculateFinalTotal = () => {
    let total = cartTotal + tipAmount;
    if (appliedCoupon) {
      total -= appliedCoupon.discountCents;
    }
    return Math.max(0, total);
  };

  const handlePlaceOrder = async () => {
    // Validaciones
    if (!customerName.trim()) {
      showToast("Por favor ingresa tu nombre", "error");
      return;
    }
    if (!customerPhone.trim()) {
      showToast("Por favor ingresa tu teléfono", "error");
      return;
    }
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      showToast("Por favor ingresa tu dirección de entrega", "error");
      return;
    }
    if (showSchedule && !scheduledTime) {
      showToast(
        "Por favor selecciona una hora para tu pedido",
        "error"
      );
      return;
    }
    // Validar que la hora programada sea al menos 30 minutos en el futuro
    if (showSchedule && scheduledTime) {
      const now = new Date();
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      const minTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutos desde ahora

      if (scheduledDate < minTime) {
        const minHour = minTime.getHours().toString().padStart(2, '0');
        const minMinute = minTime.getMinutes().toString().padStart(2, '0');
        showToast(
          `La hora programada debe ser al menos 30 minutos en el futuro. Mínimo: ${minHour}:${minMinute}`,
          "error"
        );
        return;
      }
    }
    if (cart.length === 0) {
      showToast("El carrito está vacío", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convertir cart a OrderRequest
      const orderRequest: OrderRequest = {
        customerName: customerName.trim(),
        phone: customerPhone.trim(),
        channel: "WEB",
        takeMode: orderType === "delivery" ? "DELIVERY" : "TAKEAWAY",
        address: orderType === "delivery" ? deliveryAddress.trim() : undefined,
        // reference: reference.trim() || undefined,
        //note: note.trim() || undefined,
        scheduledAt:
          showSchedule && scheduledTime
            ? (() => {
                const today = new Date();
                const [hours, minutes] = scheduledTime.split(':').map(Number);
                today.setHours(hours, minutes, 0, 0);
                // Usar formato ISO con offset de zona horaria local en lugar de UTC
                const offset = -today.getTimezoneOffset();
                const sign = offset >= 0 ? '+' : '-';
                const absOffset = Math.abs(offset);
                const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
                const offsetMinutes = String(absOffset % 60).padStart(2, '0');
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const hour = String(today.getHours()).padStart(2, '0');
                const minute = String(today.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hour}:${minute}:00${sign}${offsetHours}:${offsetMinutes}`;
              })()
            : undefined,
        subtotalCents: cartTotal,
        discountCents: appliedCoupon ? appliedCoupon.discountCents : 0,
        tipCents: tipAmount,
        totalCents: calculateFinalTotal(),
        items: cart.map((item) => {
          // Si es un combo
          if (item.type === "combo" && item.combo) {
            return {
              productId: undefined, // Los combos no tienen productId
              nameSnapshot: item.combo.name,
              qty: item.quantity,
              unitPriceCents: item.combo.priceCents,
              modifiersTotalCents: 0,
              lineTotalCents: item.subtotal,
              modifiersSnapshot: JSON.stringify({
                isCombo: true,
                comboId: item.combo.id,
                items: item.combo.items,
              }),
            };
          }

          // Si es un producto normal
          if (!item.product) {
            throw new Error("Producto no encontrado en el carrito");
          }

          // Calcular precio de modificadores
          let modifiersPriceCents = 0;
          if (item.size === "doble") {
            modifiersPriceCents += item.product.priceCents; // Doble cuesta el precio base extra
          }
          if (item.modifiers.complementos) {
            modifiersPriceCents += item.modifiers.complementos.reduce(
              (sum, complemento) => sum + complemento.priceCents,
              0
            );
          }
          if (item.modifiers.aderezos) {
            modifiersPriceCents += item.modifiers.aderezos.reduce(
              (sum, aderezo) => sum + aderezo.priceCents,
              0
            );
          }
          if (item.modifiers.extras) {
            modifiersPriceCents += item.modifiers.extras.reduce(
              (sum, extra) => sum + extra.priceCents,
              0
            );
          }
          if (item.modifiers.bebidas) {
            modifiersPriceCents += item.modifiers.bebidas.priceCents;
          }

          const unitPriceCents = item.product.priceCents;
          const lineTotalCents = item.subtotal;

          // Crear snapshot de modificadores para guardar en la BD
          const modifiersSnapshot = {
            size: item.size,
            complementos: item.modifiers.complementos?.map((m) => ({
              name: m.name,
              price: m.priceCents,
            })),
            aderezos: item.modifiers.aderezos?.map((m) => ({
              name: m.name,
              price: m.priceCents,
            })),
            extras: item.modifiers.extras?.map((m) => ({
              name: m.name,
              price: m.priceCents,
            })),
            bebidas: item.modifiers.bebidas
              ? {
                  name: item.modifiers.bebidas.name,
                  price: item.modifiers.bebidas.priceCents,
                }
              : undefined,
            notes: item.notes || undefined,
          };

          return {
            productId: parseInt(item.product.id),
            nameSnapshot: item.product.name,
            qty: item.quantity,
            unitPriceCents,
            modifiersTotalCents: modifiersPriceCents,
            lineTotalCents,
            modifiersSnapshot: JSON.stringify(modifiersSnapshot),
          };
        }),
      };

      // Enviar orden al backend
      const response = await createOrder(orderRequest);

      // Éxito!
      showToast(`Pedido #${response.id} creado exitosamente!`, "success");
      if (response.trackingUrl) {
        setTrackingUrl(response.trackingUrl);
        setCreatedOrderId(response.id);
      } else {
        closeCheckout();
      }
      clearCart();
    } catch (error: any) {
      // console.error("Error al crear orden:", error);
      let errorMessage = "Error al procesar el pedido. Por favor intenta nuevamente.";
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") {
          errorMessage = data;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
      }
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setTrackingUrl(null);
    setCreatedOrderId(null);
    closeCheckout();
  };

  const handleCopyTracking = async () => {
    if (!trackingUrl) return;
    try {
      await navigator.clipboard.writeText(trackingUrl);
      showToast("Link de seguimiento copiado", "success");
    } catch (error: any) {
      showToast("No se pudo copiar el link", "error");
    }
  };

  if (trackingUrl && createdOrderId) {
    // Extraer el código público del URL para mostrarlo amigablemente
    const publicCodeMatch = trackingUrl.match(/\/pedido\/([A-Z0-9]+)\?/);
    const publicCode = publicCodeMatch ? publicCodeMatch[1] : null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-6 text-center space-y-4">
          <div className="text-5xl mb-2">✅</div>
          <h2 className="text-2xl font-bold text-white">¡Pedido confirmado!</h2>
          <p className="text-gray-300">
            Tu pedido #{createdOrderId} ya fue recibido. Guardá este link para
            seguir el estado en tiempo real.
          </p>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">Código de seguimiento</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold text-primary tracking-wider">
                {publicCode || `#${createdOrderId}`}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Usá este código o el link para ver el estado de tu pedido
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopyTracking}
              className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar link
            </button>
            <a
              href={trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold text-center flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Ver seguimiento
            </a>
          </div>
          <button
            onClick={handleCloseSuccess}
            className="text-gray-400 hover:text-white text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-90 flex ${
        cart.length === 0 ? "items-center" : "items-end"
      } justify-center z-50`}
    >
      <div
        className={`bg-gray-900 ${
          cart.length === 0 ? "rounded-lg" : "rounded-t-3xl"
        } w-full max-w-2xl max-h-[95vh] overflow-y-auto animate-slide-in-right`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-3 md:p-4 z-10">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <button
              onClick={closeCheckout}
              className="text-gray-400 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 md:h-6 md:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-lg md:text-xl font-bold text-white">Pedido de delivery</h2>
            <button className="text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 md:h-6 md:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>

          {/* Tabs Delivery/Retirar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrderType("delivery")}
              className={`py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-semibold transition-all text-sm md:text-base ${
                orderType === "delivery"
                  ? "bg-primary text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              Delivery
            </button>
            <button
              onClick={() => setOrderType("pickup")}
              className={`py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-semibold transition-all text-sm md:text-base ${
                orderType === "pickup"
                  ? "bg-primary text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              Retirar
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {/* Recibir pedido */}
          <div className="mb-4 md:mb-6">
            <h3 className="text-white font-semibold mb-2 md:mb-3 text-sm md:text-base">Recibir pedido</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setShowSchedule(false);
                  setScheduledTime("");
                }}
                className={`py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-medium transition-all text-xs md:text-sm ${
                  !showSchedule
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                ⚡ Lo más pronto
              </button>
              <button
                onClick={() => setShowSchedule(true)}
                className={`py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-medium transition-all text-xs md:text-sm ${
                  showSchedule
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                📅 Programar
              </button>
            </div>

            {/* Selector de hora */}
            {showSchedule && (
              <div className="mt-3 md:mt-4 bg-gray-800 rounded-lg p-3 md:p-4">
                <label className="block text-white text-xs md:text-sm font-medium mb-2">
                  ¿A qué hora quieres recibir tu pedido hoy?
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={(() => {
                    const minTime = new Date(Date.now() + 30 * 60 * 1000);
                    const businessOpen = "10:00";
                    const minHour = minTime.getHours().toString().padStart(2, '0');
                    const minMinute = minTime.getMinutes().toString().padStart(2, '0');
                    const calculatedMin = `${minHour}:${minMinute}`;
                    return calculatedMin > businessOpen ? calculatedMin : businessOpen;
                  })()}
                  max="23:00"
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 md:p-3 border border-gray-700 focus:border-primary outline-none text-sm md:text-base"
                  required={showSchedule}
                />
                <p className="text-gray-400 text-xs mt-2">
                  Mínimo 30 min desde ahora. Horario: 10:00 a 23:00
                </p>
              </div>
            )}
          </div>

          {/* Lista de productos */}
          {cart.length > 0 && (
            <div className="mb-4 md:mb-6">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-white font-semibold text-sm md:text-base">
                  🍔 {cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  Producto{cart.length > 1 ? "s" : ""}
                </h3>
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="text-primary text-xs md:text-sm font-medium"
                >
                  {showSchedule ? "Ocultar" : "Programar"}
                </button>
              </div>
              <div className="space-y-2 md:space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-gray-800 rounded-lg p-3">
                    {item.type === "combo" && item.combo ? (
                      // Mostrar Combo
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-2xl">
                          🎁
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-white font-medium">
                              {item.combo.name}
                            </h4>
                          </div>
                          <p className="text-primary text-sm font-semibold">
                            COMBO ESPECIAL
                          </p>
                          {/* Mostrar items del combo */}
                          <div className="text-gray-400 text-xs space-y-1 mt-1">
                            {item.combo.items.map((comboItem, idx) => (
                              <p key={idx}>
                                • {comboItem.qty}x {comboItem.productName}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="text-gray-400 hover:text-white"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 12H4"
                                />
                              </svg>
                            </button>
                            <span className="text-white font-medium">
                              {item.quantity}u
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="text-gray-400 hover:text-white"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            </button>
                          </div>
                          <p className="text-white font-semibold text-sm">
                            ${Math.round(item.subtotal).toLocaleString("es-AR")}
                          </p>
                        </div>
                      </div>
                    ) : item.product ? (
                      // Mostrar Producto
                      <div className="flex gap-3">
                        <img
                          src={
                            item.product.hasImage
                              ? getProductsImageUrl(item.product.id)
                              : "/placeholder.png"
                          }
                          alt={item.product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-white font-medium">
                              {item.product.name}
                            </h4>
                            <button
                              onClick={() => setEditingCartItem(item)}
                              className="text-primary hover:text-opacity-80 text-sm font-medium"
                            >
                              Editar
                            </button>
                          </div>
                          <p className="text-gray-400 text-sm capitalize">
                            {item.size}
                          </p>
                          {/* Mostrar todos los modificadores */}
                          <div className="text-gray-400 text-xs space-y-1 mt-1">
                            {item.modifiers.complementos &&
                              item.modifiers.complementos.length > 0 && (
                                <p>
                                  +{" "}
                                  {item.modifiers.complementos
                                    .map((a) => a.name)
                                    .join(", ")}
                                </p>
                              )}
                            {item.modifiers.aderezos &&
                              item.modifiers.aderezos.length > 0 && (
                                <p>
                                  +{" "}
                                  {item.modifiers.aderezos
                                    .map((a) => a.name)
                                    .join(", ")}
                                </p>
                              )}
                            {item.modifiers.extras &&
                              item.modifiers.extras.length > 0 && (
                                <p>
                                  +{" "}
                                  {item.modifiers.extras
                                    .map((e) => e.name)
                                    .join(", ")}
                                </p>
                              )}
                            {item.modifiers.bebidas && (
                              <p>+ {item.modifiers.bebidas.name}</p>
                            )}
                            {item.notes && (
                              <p className="italic">Nota: {item.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="text-gray-400 hover:text-white"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 12H4"
                                />
                              </svg>
                            </button>
                            <span className="text-white font-medium">
                              {item.quantity}u
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="text-primary hover:text-opacity-80"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            </button>
                          </div>
                          <p className="text-white font-bold">
                            ${Math.round(item.subtotal).toLocaleString("es-AR")}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="text-right text-white font-bold mt-3">
                Subtotal: $ {cartTotal.toLocaleString()}
              </p>
            </div>
          )}

          {cart.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Tu carrito está vacío</p>
              <button
                onClick={closeCheckout}
                className="bg-primary text-white px-6 py-2 rounded-lg"
              >
                Explorar menú
              </button>
            </div>
          )}

          {cart.length > 0 && (
            <>
              {/* Datos del cliente */}
              <div className="mb-4 md:mb-6">
                <h3 className="text-white font-semibold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  👤 Tus datos
                </h3>
                <div className="space-y-2 md:space-y-3">
                  <input
                    type="text"
                    placeholder="Nombre y apellido"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg p-2.5 md:p-3 border border-gray-700 focus:border-primary outline-none text-sm md:text-base"
                  />
                  <div className="flex gap-2">
                    <select className="bg-gray-800 text-white rounded-lg p-2.5 md:p-3 border border-gray-700 text-sm md:text-base">
                      <option>+54</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="Teléfono*"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="flex-1 bg-gray-800 text-white rounded-lg p-2.5 md:p-3 border border-gray-700 focus:border-primary outline-none text-sm md:text-base"
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email (opcional)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg p-2.5 md:p-3 border border-gray-700 focus:border-primary outline-none text-sm md:text-base"
                  />
                </div>
              </div>

              {/* Dirección de entrega */}
              {orderType === "delivery" && (
                <div className="mb-4 md:mb-6">
                  <h3 className="text-white font-semibold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                    📍 Dirección de entrega
                  </h3>
                  <input
                    type="text"
                    placeholder="Dirección*"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg p-2.5 md:p-3 border border-gray-700 focus:border-primary outline-none text-sm md:text-base"
                  />
                </div>
              )}

              {/* Método de pago */}
              <div className="mb-4 md:mb-6">
                <h3 className="text-white font-semibold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  💳 Método de pago
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`w-full flex items-center justify-between p-3 md:p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === "cash"
                        ? "border-primary bg-primary bg-opacity-10"
                        : "border-gray-700 bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-xl md:text-2xl">💵</span>
                      <span className="text-white font-medium text-sm md:text-base">Efectivo</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("transfer")}
                    className={`w-full p-3 md:p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === "transfer"
                        ? "border-primary bg-primary bg-opacity-10"
                        : "border-gray-700 bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-xl md:text-2xl">🏦</span>
                        <span className="text-white font-medium text-sm md:text-base">
                          Transferencia
                        </span>
                      </div>
                      <button className="text-gray-400 text-sm">📋</button>
                    </div>
                    {paymentMethod === "transfer" && (
                      <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-700">
                        <p className="text-gray-400 text-xs md:text-sm">
                          Alias: *********
                        </p>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Propina */}
              <div className="mb-4 md:mb-6">
                <h3 className="text-white font-semibold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  🙏 Propina
                </h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[0, 100, 200, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTipAmount(amount)}
                      className={`flex-1 min-w-[60px] py-2 px-2 md:px-3 rounded-lg font-medium transition-all text-xs md:text-sm ${
                        tipAmount === amount
                          ? "bg-primary text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                  <button className="px-3 md:px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-xs md:text-sm">
                    Otro
                  </button>
                </div>
              </div>

              {/* Código promocional */}
              <div className="mb-4 md:mb-6">
                {!appliedCoupon ? (
                  <>
                    {!showPromoInput ? (
                      <button
                        onClick={() => setShowPromoInput(true)}
                        className="w-full flex items-center justify-between p-2.5 md:p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl md:text-2xl">🏷️</span>
                          <span className="text-white font-medium text-sm md:text-base">
                            Código promocional
                          </span>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 md:h-5 md:w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    ) : (
                      <div className="bg-gray-800 rounded-lg p-3 md:p-4">
                        <div className="flex items-center gap-2 mb-2 md:mb-3">
                          <span className="text-xl md:text-2xl">🏷️</span>
                          <span className="text-white font-medium text-sm md:text-base">
                            Ingresa tu cupón
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="CÓDIGO"
                            value={promoCode}
                            onChange={(e) =>
                              setPromoCode(e.target.value.toUpperCase())
                            }
                            className="flex-1 bg-gray-900 text-white rounded-lg p-2.5 md:p-3 border border-gray-700 focus:border-primary outline-none uppercase text-sm md:text-base"
                          />
                          <button
                            onClick={handleValidateCoupon}
                            disabled={validatingCoupon}
                            className="bg-primary hover:bg-opacity-90 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium disabled:opacity-50 text-sm md:text-base"
                          >
                            {validatingCoupon ? "..." : "Aplicar"}
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setShowPromoInput(false);
                            setPromoCode("");
                          }}
                          className="text-gray-400 text-xs md:text-sm mt-2 hover:text-white"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-green-900 bg-opacity-20 border border-green-700 rounded-lg p-3 md:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xl md:text-2xl flex-shrink-0">✅</span>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm md:text-base truncate">
                            Cupón: {appliedCoupon.code}
                          </p>
                          <p className="text-green-400 text-xs md:text-sm">
                            {appliedCoupon.type === "PERCENT"
                              ? `${appliedCoupon.value}%`
                              : `$${appliedCoupon.discountCents.toLocaleString("es-AR")}`}{" "}
                            (-${appliedCoupon.discountCents.toLocaleString("es-AR")})
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-400 hover:text-red-300 text-xs md:text-sm flex-shrink-0"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen */}
              <div className="mb-4 md:mb-6 bg-gray-800 rounded-lg p-3 md:p-4">
                <h3 className="text-white font-semibold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  📋 Resumen
                </h3>
                <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Productos</span>
                    <span>$ {cartTotal.toLocaleString()}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-400">
                      <span>Descuento ({appliedCoupon.code})</span>
                      <span>
                        - $ {appliedCoupon.discountCents.toLocaleString("es-AR")}
                      </span>
                    </div>
                  )}
                  {tipAmount > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>Propina</span>
                      <span>$ {tipAmount}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between text-white font-bold text-base md:text-lg">
                      <span>Total</span>
                      <span>$ {calculateFinalTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón realizar pedido */}
              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className={`w-full bg-primary hover:bg-opacity-90 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-lg transition-all text-base md:text-lg ${
                  isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "Procesando..." : "Realizar pedido"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal para editar item del carrito */}
      {editingCartItem && editingCartItem.product && (
        <ProductDetailModal
          product={editingCartItem.product}
          onClose={() => setEditingCartItem(null)}
          editMode={true}
          existingCartItem={editingCartItem}
        />
      )}
    </div>
  );
};

export default CheckoutModal;
