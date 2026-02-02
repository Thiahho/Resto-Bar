import React, { useEffect, useMemo, useState } from "react";

interface GrowthConfig {
  upsellEnabled: boolean;
  upsellDiscount: number;
  upsellMessage: string;
  smartCombos: {
    mostRequested: boolean;
    nightCombo: boolean;
    comboForTwo: boolean;
  };
  automations: {
    winback15Days: boolean;
    tuesdayTwoForOne: boolean;
    happyHourDigital: boolean;
  };
  peakHourMode: {
    enabled: boolean;
    hideSlowProducts: boolean;
    boostFastProducts: boolean;
    thresholdOrders: number;
  };
  dynamicPricing: {
    enabled: boolean;
    offPeakDiscount: number;
    offPeakStart: string;
    offPeakEnd: string;
    peakMessage: string;
  };
}

const DEFAULT_CONFIG: GrowthConfig = {
  upsellEnabled: true,
  upsellDiscount: 15,
  upsellMessage: "Agrega papas + bebida con 15% OFF",
  smartCombos: {
    mostRequested: true,
    nightCombo: true,
    comboForTwo: true,
  },
  automations: {
    winback15Days: true,
    tuesdayTwoForOne: false,
    happyHourDigital: true,
  },
  peakHourMode: {
    enabled: false,
    hideSlowProducts: true,
    boostFastProducts: true,
    thresholdOrders: 18,
  },
  dynamicPricing: {
    enabled: false,
    offPeakDiscount: 10,
    offPeakStart: "18:00",
    offPeakEnd: "20:00",
    peakMessage: "Precio normal en hora pico",
  },
};

const STORAGE_KEY = "saas-growth-config";

const GrowthManager: React.FC = () => {
  const [config, setConfig] = useState<GrowthConfig>(DEFAULT_CONFIG);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setConfig(JSON.parse(stored));
      } catch {
        setConfig(DEFAULT_CONFIG);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const summary = useMemo(() => {
    const enabledBlocks = [
      config.upsellEnabled,
      Object.values(config.smartCombos).some(Boolean),
      Object.values(config.automations).some(Boolean),
      config.peakHourMode.enabled,
      config.dynamicPricing.enabled,
    ].filter(Boolean).length;

    return `${enabledBlocks} módulos activos`;
  }, [config]);

  const handleSave = () => {
    setSavedAt(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Centro de crecimiento SaaS
            </h1>
            <p className="text-gray-600 mt-2">
              Activa automatizaciones para subir el ticket promedio y reducir tiempos.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">Estado:</span> {summary}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Upsell automático</h2>
              <p className="text-gray-500 text-sm">
                Sugerencias dinámicas para papas + bebida con descuento.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.upsellEnabled}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, upsellEnabled: event.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary relative">
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Descuento (%)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={config.upsellDiscount}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    upsellDiscount: Number(event.target.value),
                  }))
                }
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Mensaje de oferta</label>
              <input
                type="text"
                value={config.upsellMessage}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, upsellMessage: event.target.value }))
                }
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Combos inteligentes</h2>
          <p className="text-gray-500 text-sm">
            Recomendaciones automáticas según momentos de consumo.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={config.smartCombos.mostRequested}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    smartCombos: { ...prev.smartCombos, mostRequested: event.target.checked },
                  }))
                }
              />
              Los más pedidos
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={config.smartCombos.nightCombo}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    smartCombos: { ...prev.smartCombos, nightCombo: event.target.checked },
                  }))
                }
              />
              Combo noche
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={config.smartCombos.comboForTwo}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    smartCombos: { ...prev.smartCombos, comboForTwo: event.target.checked },
                  }))
                }
              />
              Combo para 2
            </label>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Automatizaciones</h2>
          <p className="text-gray-500 text-sm">
            Flujos que ayudan a reactivar clientes y acelerar ventas.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={config.automations.winback15Days}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    automations: { ...prev.automations, winback15Days: event.target.checked },
                  }))
                }
              />
              Hace 15 días que no pedís → cupón automático
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={config.automations.tuesdayTwoForOne}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    automations: { ...prev.automations, tuesdayTwoForOne: event.target.checked },
                  }))
                }
              />
              Martes 2x1
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={config.automations.happyHourDigital}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    automations: { ...prev.automations, happyHourDigital: event.target.checked },
                  }))
                }
              />
              Happy hour digital
            </label>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Modo hora pico</h2>
          <p className="text-gray-500 text-sm">
            Prioriza productos rápidos cuando la cocina se satura.
          </p>
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={config.peakHourMode.enabled}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  peakHourMode: { ...prev.peakHourMode, enabled: event.target.checked },
                }))
              }
            />
            Activar modo hora pico
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={config.peakHourMode.hideSlowProducts}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    peakHourMode: {
                      ...prev.peakHourMode,
                      hideSlowProducts: event.target.checked,
                    },
                  }))
                }
              />
              Ocultar productos lentos
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={config.peakHourMode.boostFastProducts}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    peakHourMode: {
                      ...prev.peakHourMode,
                      boostFastProducts: event.target.checked,
                    },
                  }))
                }
              />
              Mostrar productos rápidos
            </label>
            <div>
              <label className="text-sm text-gray-600">Umbral de pedidos cada 15 min</label>
              <input
                type="number"
                min={5}
                max={60}
                value={config.peakHourMode.thresholdOrders}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    peakHourMode: {
                      ...prev.peakHourMode,
                      thresholdOrders: Number(event.target.value),
                    },
                  }))
                }
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Dynamic pricing light</h2>
          <p className="text-gray-500 text-sm">
            Descuentos para horas muertas y precio normal en pico.
          </p>
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={config.dynamicPricing.enabled}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  dynamicPricing: { ...prev.dynamicPricing, enabled: event.target.checked },
                }))
              }
            />
            Activar pricing dinámico
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Descuento fuera de pico (%)</label>
              <input
                type="number"
                min={0}
                max={30}
                value={config.dynamicPricing.offPeakDiscount}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    dynamicPricing: {
                      ...prev.dynamicPricing,
                      offPeakDiscount: Number(event.target.value),
                    },
                  }))
                }
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Mensaje en hora pico</label>
              <input
                type="text"
                value={config.dynamicPricing.peakMessage}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    dynamicPricing: { ...prev.dynamicPricing, peakMessage: event.target.value },
                  }))
                }
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Inicio descuento</label>
              <input
                type="time"
                value={config.dynamicPricing.offPeakStart}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    dynamicPricing: { ...prev.dynamicPricing, offPeakStart: event.target.value },
                  }))
                }
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Fin descuento</label>
              <input
                type="time"
                value={config.dynamicPricing.offPeakEnd}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    dynamicPricing: { ...prev.dynamicPricing, offPeakEnd: event.target.value },
                  }))
                }
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-sm text-gray-500">
          {savedAt ? `Último guardado a las ${savedAt}` : "Aún no guardaste cambios"}
        </div>
        <button
          onClick={handleSave}
          className="bg-primary text-white px-6 py-2 rounded-md font-semibold hover:bg-opacity-90"
        >
          Guardar configuración
        </button>
      </div>
    </div>
  );
};

export default GrowthManager;
