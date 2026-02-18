import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api/apiClient";
import { useToast } from "../../contexts/ToastContext";

interface SimpleProduct {
  id: number;
  name: string;
  categoryId: number;
  categoryName?: string;
}

interface GrowthConfig {
  upsellEnabled: boolean;
  upsellDiscount: number;
  upsellMessage: string;
  upsellProductIds: number[];
  smartCombos: {
    mostRequested: boolean;
    nightCombo: boolean;
    comboForTwo: boolean;
  };
  automations: {
    winbackEnabled: boolean;
    winbackDays: number;
    twoForOneEnabled: boolean;
    twoForOneDays: string[];
    twoForOneProductIds: number[];
    happyHourEnabled: boolean;
    happyHourDays: string[];
    happyHourStart: string;
    happyHourEnd: string;
    happyHourDiscount: number;
    happyHourProductIds: number[];
  };
  peakHourMode: {
    enabled: boolean;
    hideSlowProducts: boolean;
    boostFastProducts: boolean;
    thresholdOrders: number;
    peakStart: string;
    peakEnd: string;
  };
  dynamicPricing: {
    enabled: boolean;
    offPeakDiscount: number;
    offPeakStart: string;
    offPeakEnd: string;
    peakMessage: string;
    productIds: number[];
  };
}

const DEFAULT_CONFIG: GrowthConfig = {
  upsellEnabled: false,
  upsellDiscount: 0,
  upsellMessage: "",
  upsellProductIds: [],
  smartCombos: {
    mostRequested: false,
    nightCombo: false,
    comboForTwo: false,
  },
  automations: {
    winbackEnabled: false,
    winbackDays: 0,
    twoForOneEnabled: false,
    twoForOneDays: [],
    twoForOneProductIds: [],
    happyHourEnabled: false,
    happyHourDays: [],
    happyHourStart: "",
    happyHourEnd: "",
    happyHourDiscount: 0,
    happyHourProductIds: [],
  },
  peakHourMode: {
    enabled: false,
    hideSlowProducts: false,
    boostFastProducts: false,
    thresholdOrders: 0,
    peakStart: "",
    peakEnd: "",
  },
  dynamicPricing: {
    enabled: false,
    offPeakDiscount: 0,
    offPeakStart: "",
    offPeakEnd: "",
    peakMessage: "",
    productIds: [],
  },
};

const DAYS_OF_WEEK = [
  { value: "lunes", label: "Lunes" },
  { value: "martes", label: "Martes" },
  { value: "miercoles", label: "Miércoles" },
  { value: "jueves", label: "Jueves" },
  { value: "viernes", label: "Viernes" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

const GrowthManager: React.FC = () => {
  const [config, setConfig] = useState<GrowthConfig>(DEFAULT_CONFIG);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [configData, productsData] = await Promise.all([
          api.get<GrowthConfig>("/api/admin/growth-settings"),
          api.get<SimpleProduct[]>("/api/admin/products"),
        ]);
        setConfig({
          ...configData,
          upsellProductIds: configData.upsellProductIds || [],
          automations: {
            ...configData.automations,
            twoForOneProductIds: configData.automations.twoForOneProductIds || [],
            happyHourProductIds: configData.automations.happyHourProductIds || [],
          },
          dynamicPricing: {
            ...configData.dynamicPricing,
            productIds: configData.dynamicPricing.productIds || [],
          },
        });
        setProducts(productsData);
      } catch (error: any) {
        showToast(
          error?.message || "No se pudo cargar la configuración de crecimiento",
          "error"
        );
        setConfig(DEFAULT_CONFIG);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const saved = await api.put<GrowthConfig>("/api/admin/growth-settings", config);
      setConfig(saved);
      setSavedAt(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }));
      showToast("Configuración guardada correctamente", "success");
    } catch (error: any) {
      showToast(error?.message || "No se pudo guardar la configuración", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (days: string[], day: string) =>
    days.includes(day) ? days.filter((value) => value !== day) : [...days, day];

  const toggleProduct = (productIds: number[], productId: number) =>
    productIds.includes(productId)
      ? productIds.filter((id) => id !== productId)
      : [...productIds, productId];

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
            <span className="font-semibold text-gray-700">Estado:</span>{" "}
            {isLoading ? "Cargando..." : summary}
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
          <div>
            <label className="text-sm text-gray-600 block mb-2">
              Productos para upsell (selecciona los que quieras ofrecer)
            </label>
            <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
              {products.length === 0 ? (
                <p className="text-gray-400 text-sm">Cargando productos...</p>
              ) : (
                products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 p-1 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.upsellProductIds.includes(product.id)}
                      onChange={() =>
                        setConfig((prev) => ({
                          ...prev,
                          upsellProductIds: toggleProduct(prev.upsellProductIds, product.id),
                        }))
                      }
                      className="rounded"
                    />
                    {product.name}
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Si no seleccionas ninguno, no se mostrará el upsell.
            </p>
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
                checked={config.automations.winbackEnabled}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    automations: { ...prev.automations, winbackEnabled: event.target.checked },
                  }))
                }
              />
              Hace 15 días que no pedís → cupón automático
            </label>
            <div>
              <label className="text-sm text-gray-600">Días sin compra para activar cupón</label>
              <input
                type="number"
                min={1}
                max={90}
                value={config.automations.winbackDays}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    automations: {
                      ...prev.automations,
                      winbackDays: Number(event.target.value),
                    },
                  }))
                }
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={config.automations.twoForOneEnabled}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    automations: {
                      ...prev.automations,
                      twoForOneEnabled: event.target.checked,
                    },
                  }))
                }
              />
              Promoción 2x1
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <label key={day.value} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={config.automations.twoForOneDays.includes(day.value)}
                    onChange={() =>
                      setConfig((prev) => ({
                        ...prev,
                        automations: {
                          ...prev.automations,
                          twoForOneDays: toggleDay(prev.automations.twoForOneDays, day.value),
                        },
                      }))
                    }
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-sm text-gray-600 font-medium">
                Productos incluidos en 2x1
                <span className="ml-2 text-xs text-gray-400">
                  ({config.automations.twoForOneProductIds.length} seleccionados)
                </span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Si no seleccionas ninguno, el 2x1 aplica a todos los productos.
              </p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                {products.length === 0 ? (
                  <p className="text-sm text-gray-400">Cargando productos...</p>
                ) : (
                  products.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 p-1 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={config.automations.twoForOneProductIds.includes(product.id)}
                        onChange={() =>
                          setConfig((prev) => ({
                            ...prev,
                            automations: {
                              ...prev.automations,
                              twoForOneProductIds: toggleProduct(
                                prev.automations.twoForOneProductIds,
                                product.id
                              ),
                            },
                          }))
                        }
                        className="rounded"
                      />
                      {product.name}
                    </label>
                  ))
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={config.automations.happyHourEnabled}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    automations: {
                      ...prev.automations,
                      happyHourEnabled: event.target.checked,
                    },
                  }))
                }
              />
              Happy hour digital
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <label key={day.value} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={config.automations.happyHourDays.includes(day.value)}
                    onChange={() =>
                      setConfig((prev) => ({
                        ...prev,
                        automations: {
                          ...prev.automations,
                          happyHourDays: toggleDay(prev.automations.happyHourDays, day.value),
                        },
                      }))
                    }
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-gray-600">Inicio happy hour</label>
                <input
                  type="time"
                  value={config.automations.happyHourStart}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      automations: {
                        ...prev.automations,
                        happyHourStart: event.target.value,
                      },
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Fin happy hour</label>
                <input
                  type="time"
                  value={config.automations.happyHourEnd}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      automations: {
                        ...prev.automations,
                        happyHourEnd: event.target.value,
                      },
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Descuento (%)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={config.automations.happyHourDiscount}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      automations: {
                        ...prev.automations,
                        happyHourDiscount: Number(event.target.value),
                      },
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded-md p-2"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                Productos con descuento (seleccioná al menos uno)
              </label>
              <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                {products.length === 0 ? (
                  <p className="text-gray-400 text-sm">Cargando productos...</p>
                ) : (
                  products.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 p-1 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={config.automations.happyHourProductIds.includes(product.id)}
                        onChange={() =>
                          setConfig((prev) => ({
                            ...prev,
                            automations: {
                              ...prev.automations,
                              happyHourProductIds: toggleProduct(
                                prev.automations.happyHourProductIds,
                                product.id
                              ),
                            },
                          }))
                        }
                        className="rounded"
                      />
                      {product.name}
                    </label>
                  ))
                )}
              </div>
            </div>
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
            <div>
              <label className="text-sm text-gray-600">Inicio hora pico</label>
              <input
                type="time"
                value={config.peakHourMode.peakStart}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    peakHourMode: {
                      ...prev.peakHourMode,
                      peakStart: event.target.value,
                    },
                  }))
                }
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Fin hora pico</label>
              <input
                type="time"
                value={config.peakHourMode.peakEnd}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    peakHourMode: {
                      ...prev.peakHourMode,
                      peakEnd: event.target.value,
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
          <div>
            <label className="text-sm text-gray-600 block mb-2">
              Productos con descuento (vacío = todos)
            </label>
            <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
              {products.length === 0 ? (
                <p className="text-gray-400 text-sm">Cargando productos...</p>
              ) : (
                products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 p-1 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.dynamicPricing.productIds.includes(product.id)}
                      onChange={() =>
                        setConfig((prev) => ({
                          ...prev,
                          dynamicPricing: {
                            ...prev.dynamicPricing,
                            productIds: toggleProduct(
                              prev.dynamicPricing.productIds,
                              product.id
                            ),
                          },
                        }))
                      }
                      className="rounded"
                    />
                    {product.name}
                  </label>
                ))
              )}
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
          disabled={isSaving}
          className="bg-primary text-white px-6 py-2 rounded-md font-semibold hover:bg-opacity-90 disabled:opacity-60"
        >
          {isSaving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
};

export default GrowthManager;
