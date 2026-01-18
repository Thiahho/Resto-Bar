import React, { useEffect, useState } from "react";
import { useCatalog } from "../../hooks/useCatalog";
import { useToast } from "../../contexts/ToastContext";
import { BusinessInfo } from "../../types";

const SiteSettings: React.FC = () => {
  const { businessInfo, updateBusinessInfo, isLoading } = useCatalog();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<BusinessInfo | null>(businessInfo);
  const [hoursString, setHoursString] = useState("");

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");

  // Cargar settings cuando llega businessInfo
  useEffect(() => {
    if (!businessInfo) return;
    setSettings(businessInfo);
    setHoursString(businessInfo.hours?.join("\n") || "");
  }, [businessInfo]);

  // Cleanup del objectURL (evita leak)
  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  if (isLoading || !settings) return <div>Cargando ajustes...</div>;

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    setBannerFile(file);

    // limpiar preview anterior
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);

    // setear nuevo preview
    setBannerPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const keys = name.split(".");

    setSettings((prev) => {
      if (!prev) return null;

      // deep copy simple (ok para este caso)
      const newState: any = JSON.parse(JSON.stringify(prev));
      let current: any = newState;

      keys.forEach((key, index) => {
        if (index === keys.length - 1) current[key] = value;
        else current = current[key];
      });

      return newState;
    });
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setHoursString(v);

    setSettings((prev) => (prev ? { ...prev, hours: v.split("\n") } : null));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const formData = new FormData();
    formData.append("Name", settings.name);
    if (settings.description) formData.append("Description", settings.description);

    formData.append("ContactAddress", settings.contact.address ?? "");
    formData.append("ContactPhone", settings.contact.phone ?? "");
    if (settings.contact.transferAlias)
      formData.append("ContactTransferAlias", settings.contact.transferAlias);

    formData.append("BannerTitle", settings.banner.title ?? "");
    formData.append("BannerSubtitle", settings.banner.subtitle ?? "");

    formData.append("SocialInstagram", settings.contact.social.instagram ?? "");
    formData.append("SocialFacebook", settings.contact.social.facebook ?? "");

    // Horarios
    (settings.hours ?? []).forEach((hour, index) => {
      formData.append(`Hours[${index}]`, hour);
    });

    // Imagen banner (solo si seleccionaron archivo)
    if (bannerFile) {
      formData.append("bannerImage", bannerFile);
    }

    const success = await updateBusinessInfo(formData);

    if (success) {
      showToast("Settings updated successfully!", "success");
      setBannerFile(null);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setBannerPreview("");
    } else {
      showToast("Failed to update settings.", "error");
    }
  };

  const inputClasses =
    "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-primary";
  const labelClasses = "block text-gray-700 text-sm font-bold mb-2";
  const sectionTitleClasses =
    "text-xl font-semibold text-gray-700 mb-4 border-b pb-2";

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5277";

  // Ajustá la ruta si tu GET es otro
  const bannerUrl = `${API_URL}/api/public/banner/image`;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
        Configuracion de la tienda
      </h1>

      <div className="bg-white p-4 md:p-8 rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h2 className={sectionTitleClasses}>Información comercial</h2>
            </div>

            <div>
              <label className={labelClasses}>Nombre del Local</label>
              <input
                type="text"
                name="name"
                value={settings.name}
                onChange={handleInputChange}
                className={inputClasses}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClasses}>Descripción del Negocio</label>
              <input
                type="text"
                name="description"
                value={settings.description || ""}
                onChange={handleInputChange}
                placeholder="Ej: Todas incluyen papas fritas caseras"
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>DIRECCIÓN</label>
              <input
                type="text"
                name="contact.address"
                value={settings.contact.address}
                onChange={handleInputChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Numero de WhatsApp</label>
              <input
                type="text"
                name="contact.phone"
                value={settings.contact.phone}
                onChange={handleInputChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Alias de Transferencia</label>
              <input
                type="text"
                name="contact.transferAlias"
                value={settings.contact.transferAlias || ""}
                onChange={handleInputChange}
                placeholder="Ej: MI.ALIAS.CVU"
                className={inputClasses}
              />
            </div>

            <div className="md:col-span-2 mt-4">
              <h2 className={sectionTitleClasses}>Banner de la página de inicio</h2>
            </div>

            <div>
              <label className={labelClasses}>Titulo Banner</label>
              <input
                type="text"
                name="banner.title"
                value={settings.banner.title}
                onChange={handleInputChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Subtitulo Banner</label>
              <input
                type="text"
                name="banner.subtitle"
                value={settings.banner.subtitle}
                onChange={handleInputChange}
                className={inputClasses}
              />
            </div>

            {/* Imagen + Preview */}
            <div className="md:col-span-2">
              <label className={labelClasses}>Imagen del Banner (se guarda como WebP)</label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileChange}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Recomendado: horizontal (ej. 1600×600). Se convierte a WebP en el servidor.
                  </p>

                  {bannerFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setBannerFile(null);
                        if (bannerPreview) URL.revokeObjectURL(bannerPreview);
                        setBannerPreview("");
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Quitar imagen seleccionada
                    </button>
                  )}
                </div>

                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={bannerPreview || `${bannerUrl}?v=${Date.now()}`}
                    alt="Preview Banner"
                    className="w-full h-40 md:h-44 object-cover"
                  />

                </div>
              </div>
            </div>

            <div className="md:col-span-2 mt-4">
              <h2 className={sectionTitleClasses}>Horario y redes sociales</h2>
            </div>

            <div>
              <label className={labelClasses}>Horario de apertura</label>
              <textarea
                value={hoursString}
                onChange={handleHoursChange}
                className={inputClasses}
                rows={5}
              />
            </div>

            <div>
              <label className={labelClasses}>Instagram URL</label>
              <input
                type="text"
                name="contact.social.instagram"
                value={settings.contact.social.instagram}
                onChange={handleInputChange}
                className={inputClasses}
              />

              <label className={`${labelClasses} mt-4`}>Facebook URL</label>
              <input
                type="text"
                name="contact.social.facebook"
                value={settings.contact.social.facebook}
                onChange={handleInputChange}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              className="w-full md:w-auto bg-primary text-white font-bold py-2 px-6 rounded hover:bg-amber-600 transition-colors"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SiteSettings;
