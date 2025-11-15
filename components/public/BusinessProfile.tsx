import React from "react";
import { BusinessInfo } from "../../types";

interface BusinessProfileProps {
  businessInfo: BusinessInfo;
}

const BusinessProfile: React.FC<BusinessProfileProps> = ({ businessInfo }) => {
  // Obtener el horario de hoy
  const getTodayHours = () => {
    if (!businessInfo.hours || businessInfo.hours.length === 0) {
      return "19:30";
    }
    return businessInfo.hours[0] || "19:30";
  };

  return (
    <div className="w-full flex justify-center bg-black">
      <div className="w-full max-w-2xl relative">
        {/* Logo superpuesto al banner */}
        <div className="absolute -top-8 left-0">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-bold text-2xl border-4 border-black shadow-lg">
            {businessInfo.name.charAt(0)}
          </div>
        </div>

        <div className="pt-12 pb-4">
          {/* Info del negocio */}
          <div className="mb-3">
            <h1 className="text-xl font-bold text-white mb-1">
              {businessInfo.name}
            </h1>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-white font-semibold">5.0</span>
              <span className="text-white">⭐</span>
            </div>
            <p className="text-gray-400 text-sm">
              Todas incluyen papas fritas caseras
            </p>
          </div>

          {/* Horario */}
          <div className="mb-4">
            <div className="border-2 border-primary rounded-lg py-2.5 text-center bg-gray-900/50">
              <span className="text-white font-medium">
                Abre {getTodayHours()}
              </span>
            </div>
          </div>

          {/* Delivery / Retirar */}
          {/* <div className="mb-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOrderType("delivery")}
                className={`py-3 px-4 rounded-lg font-semibold text-base transition-all ${
                  orderType === "delivery"
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
              >
                Delivery
              </button>
              <button
                onClick={() => setOrderType("pickup")}
                className={`py-3 px-4 rounded-lg font-semibold text-base transition-all ${
                  orderType === "pickup"
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
              >
                Retirar
              </button>
            </div>
          </div> */}

          {/* Recibir pedido */}
          {/* <div>
            <h3 className="text-white font-semibold mb-3">Recibir pedido</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeliveryTime("asap")}
                className={`py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  deliveryTime === "asap"
                    ? "bg-primary text-white"
                    : "bg-transparent text-white border-2 border-primary hover:bg-primary-600/10"
                }`}
              >
                {deliveryTime === "asap" && <Check className="w-5 h-5" />}
                Lo más pronto
              </button>
              <button
                onClick={() => setDeliveryTime("scheduled")}
                className={`py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  deliveryTime === "scheduled"
                    ? "bg-primary text-white"
                    : "bg-transparent text-white border-2 border-primary hover:bg-green-600/10"
                }`}
              >
                {deliveryTime === "scheduled" && <Check className="w-5 h-5" />}
                Programar entrega
              </button>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default BusinessProfile;
