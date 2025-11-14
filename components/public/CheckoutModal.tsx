import React, { useState } from "react";
import { useCart } from "../../contexts/CartContext";
import { OrderType, CheckoutData, OrderRequest, CartItem } from "../../types";
import { api, getProductsImageUrl, createOrder } from "../../services/api/apiClient";
import { useToast } from "../../contexts/ToastContext";
import ProductDetailModal from "./ProductDetailModal";

const CheckoutModal: React.FC = () => {
  const {
    cart,
    cartTotal,
    isCheckoutOpen,
    closeCheckout,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { showToast } = useToast();
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
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
      total -= appliedCoupon.discountCents / 100;
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
    if (showSchedule && !scheduledDateTime) {
      showToast("Por favor selecciona una fecha y hora para tu pedido", "error");
      return;
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
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
        scheduledAt: showSchedule && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : undefined,
        subtotalCents: Math.round(cartTotal * 100),
        discountCents: appliedCoupon ? appliedCoupon.discountCents : 0,
        tipCents: Math.round(tipAmount * 100),
        totalCents: Math.round(calculateFinalTotal() * 100),
        items: cart.map((item) => {
          // Si es un combo
          if (item.type === "combo" && item.combo) {
            return {
              productId: undefined, // Los combos no tienen productId
              nameSnapshot: item.combo.name,
              qty: item.quantity,
              unitPriceCents: item.combo.priceCents,
              modifiersTotalCents: 0,
              lineTotalCents: Math.round(item.subtotal * 100),
              modifiersSnapshot: JSON.stringify({
                isCombo: true,
                comboId: item.combo.id,
                items: item.combo.items
              })
            };
          }

          // Si es un producto normal
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
          const lineTotalCents = Math.round(item.subtotal * 100);

          // Crear snapshot de modificadores para guardar en la BD
          const modifiersSnapshot = {
            size: item.size,
            complementos: item.modifiers.complementos?.map(m => ({ name: m.name, price: m.priceCents })),
            aderezos: item.modifiers.aderezos?.map(m => ({ name: m.name, price: m.priceCents })),
            extras: item.modifiers.extras?.map(m => ({ name: m.name, price: m.priceCents })),
            bebidas: item.modifiers.bebidas ? { name: item.modifiers.bebidas.name, price: item.modifiers.bebidas.priceCents } : undefined,
            notes: item.notes || undefined
          };

          return {
            productId: parseInt(item.product.id),
            nameSnapshot: item.product.name,
            qty: item.quantity,
            unitPriceCents,
            modifiersTotalCents: modifiersPriceCents,
            lineTotalCents,
            modifiersSnapshot: JSON.stringify(modifiersSnapshot)
          };
        }),
      };

      // Enviar orden al backend
      const response = await createOrder(orderRequest);

      // Éxito!
      showToast(`Pedido #${response.id} creado exitosamente!`, "success");
      clearCart();
      closeCheckout();
    } catch (error: any) {
      console.error("Error al crear orden:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data ||
        "Error al procesar el pedido. Por favor intenta nuevamente.";
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-90 flex ${cart.length === 0 ? 'items-center' : 'items-end'} justify-center z-50`}>
      <div className={`bg-gray-900 ${cart.length === 0 ? 'rounded-lg' : 'rounded-t-3xl'} w-full max-w-2xl max-h-[95vh] overflow-y-auto animate-slide-in-right`}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={closeCheckout}
              className="text-gray-400 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
            <h2 className="text-xl font-bold text-white">Pedido de delivery</h2>
            <button className="text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
          <div className="flex gap-2">
            <button
              onClick={() => setOrderType("delivery")}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                orderType === "delivery"
                  ? "bg-primary text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              Delivery
            </button>
            <button
              onClick={() => setOrderType("pickup")}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                orderType === "pickup"
                  ? "bg-primary text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              Retirar
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Recibir pedido */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3">Recibir pedido</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSchedule(false);
                  setScheduledDateTime("");
                }}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  !showSchedule
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                ⚡ Lo más pronto
              </button>
              <button
                onClick={() => setShowSchedule(true)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  showSchedule
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                📅 Programar entrega
              </button>
            </div>

            {/* Selector de fecha/hora */}
            {showSchedule && (
              <div className="mt-4 bg-gray-800 rounded-lg p-4">
                <label className="block text-white text-sm font-medium mb-2">
                  ¿Cuándo quieres recibir tu pedido?
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  min={new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)}
                  max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                  className="w-full bg-gray-900 text-white rounded-lg p-3 border border-gray-700 focus:border-primary outline-none"
                  required={showSchedule}
                />
                <p className="text-gray-400 text-xs mt-2">
                  Mínimo 30 minutos de anticipación, máximo 7 días
                </p>
              </div>
            )}
          </div>

          {/* Lista de productos */}
          {cart.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">
                  🍔 {cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  Producto{cart.length > 1 ? "s" : ""}
                </h3>
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="text-primary text-sm font-medium"
                >
                  {showSchedule ? "Ocultar" : "Programar"}
                </button>
              </div>
              <div className="space-y-3">
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
                                <p>+ {item.modifiers.complementos.map((a) => a.name).join(", ")}</p>
                              )}
                            {item.modifiers.aderezos &&
                              item.modifiers.aderezos.length > 0 && (
                                <p>+ {item.modifiers.aderezos.map((a) => a.name).join(", ")}</p>
                              )}
                            {item.modifiers.extras &&
                              item.modifiers.extras.length > 0 && (
                                <p>+ {item.modifiers.extras.map((e) => e.name).join(", ")}</p>
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
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  👤 Tus datos
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nombre y apellido"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-primary outline-none"
                  />
                  <div className="flex gap-2">
                    <select className="bg-gray-800 text-white rounded-lg p-3 border border-gray-700">
                      <option>+54</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="Teléfono*"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="flex-1 bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-primary outline-none"
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email (opcional)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Dirección de entrega */}
              {orderType === "delivery" && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    📍 Dirección de entrega
                  </h3>
                  <input
                    type="text"
                    placeholder="Dirección*"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-primary outline-none"
                  />
                </div>
              )}

              {/* Método de pago */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  💳 Método de pago
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === "cash"
                        ? "border-primary bg-primary bg-opacity-10"
                        : "border-gray-700 bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💵</span>
                      <span className="text-white font-medium">Efectivo</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("transfer")}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === "transfer"
                        ? "border-primary bg-primary bg-opacity-10"
                        : "border-gray-700 bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🏦</span>
                        <span className="text-white font-medium">
                          Transferencia
                        </span>
                      </div>
                      <button className="text-gray-400 text-sm">📋</button>
                    </div>
                    {paymentMethod === "transfer" && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-gray-400 text-sm">
                          Alias: *********
                        </p>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Propina */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  🙏 Propina
                </h3>
                <div className="flex gap-2 mb-2">
                  {[0, 100, 200, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTipAmount(amount)}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                        tipAmount === amount
                          ? "bg-primary text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                  <button className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">
                    Otro
                  </button>
                </div>
              </div>

              {/* Código promocional */}
              <div className="mb-6">
                {!appliedCoupon ? (
                  <>
                    {!showPromoInput ? (
                      <button
                        onClick={() => setShowPromoInput(true)}
                        className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🏷️</span>
                          <span className="text-white font-medium">
                            Código promocional
                          </span>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-400"
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
                      <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">🏷️</span>
                          <span className="text-white font-medium">
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
                            className="flex-1 bg-gray-900 text-white rounded-lg p-3 border border-gray-700 focus:border-primary outline-none uppercase"
                          />
                          <button
                            onClick={handleValidateCoupon}
                            disabled={validatingCoupon}
                            className="bg-primary hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
                          >
                            {validatingCoupon ? "..." : "Aplicar"}
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setShowPromoInput(false);
                            setPromoCode("");
                          }}
                          className="text-gray-400 text-sm mt-2 hover:text-white"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-green-900 bg-opacity-20 border border-green-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">✅</span>
                        <div>
                          <p className="text-white font-medium">
                            Cupón aplicado: {appliedCoupon.code}
                          </p>
                          <p className="text-green-400 text-sm">
                            Descuento:{" "}
                            {appliedCoupon.type === "PERCENT"
                              ? `${appliedCoupon.value}%`
                              : `$${Math.round(appliedCoupon.discountCents / 100).toLocaleString("es-AR")}`}{" "}
                            (-${Math.round(appliedCoupon.discountCents / 100).toLocaleString("es-AR")})
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen */}
              <div className="mb-6 bg-gray-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  📋 Resumen
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Productos</span>
                    <span>$ {cartTotal.toLocaleString()}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-400">
                      <span>Descuento ({appliedCoupon.code})</span>
                      <span>- $ {Math.round(appliedCoupon.discountCents / 100).toLocaleString("es-AR")}</span>
                    </div>
                  )}
                  {tipAmount > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>Propina</span>
                      <span>$ {tipAmount}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between text-white font-bold text-lg">
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
                className={`w-full bg-primary hover:bg-opacity-90 text-white font-bold py-4 px-6 rounded-lg transition-all text-lg ${
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
      {editingCartItem && (
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
