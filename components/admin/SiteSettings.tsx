import React, { useState, useEffect } from "react";
import { useCatalog } from "../../hooks/useCatalog";
import { useToast } from "../../contexts/ToastContext";
import { BusinessInfo } from "../../types";
import { getFullApiUrl } from "../../services/api/apiClient";

const SiteSettings: React.FC = () => {
  const { businessInfo, updateBusinessInfo, isLoading } = useCatalog();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<BusinessInfo | null>(businessInfo);
  const [hoursString, setHoursString] = useState("");

  useEffect(() => {
    if (businessInfo) {
      setSettings(businessInfo);
      setHoursString(businessInfo.hours?.join("\n") || "");
    }
  }, [businessInfo]);

  if (isLoading || !settings) {
    return <div>Cargando ajustes...</div>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const keys = name.split(".");

    setSettings((prev) => {
      if (!prev) return null;
      let newState = JSON.parse(JSON.stringify(prev)); // Deep copy
      let current: any = newState;
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          current[key] = value;
        } else {
          current = current[key];
        }
      });
      return newState;
    });
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHoursString(e.target.value);
    setSettings((prev) =>
      prev ? { ...prev, hours: e.target.value.split("\n") } : null
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    // Siempre enviar como FormData
    const formData = new FormData();
    formData.append("Name", settings.name);
    formData.append("ContactAddress", settings.contact.address);
    formData.append("ContactPhone", settings.contact.phone);
    formData.append("BannerTitle", settings.banner.title);
    formData.append("BannerSubtitle", settings.banner.subtitle);
    formData.append("SocialInstagram", settings.contact.social.instagram);
    formData.append("SocialFacebook", settings.contact.social.facebook);

    // Agregar horarios
    settings.hours?.forEach((hour, index) => {
      formData.append(`Hours[${index}]`, hour);
    });

    const success = await updateBusinessInfo(formData);
    if (success) {
      showToast("Settings updated successfully!", "success");
    } else {
      showToast("Failed to update settings.", "error");
    }
  };

  const inputClasses =
    "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-primary";
  const labelClasses = "block text-gray-700 text-sm font-bold mb-2";
  const sectionTitleClasses =
    "text-xl font-semibold text-gray-700 mb-4 border-b pb-2";

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Configuracion de la tienda
      </h1>
      <div className="bg-white p-8 rounded-lg shadow-md">
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

            <div className="md:col-span-2 mt-4">
              <h2 className={sectionTitleClasses}>
                Banner de la página de inicio
              </h2>
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

            <div className="md:col-span-2 mt-4">
              <h2 className={sectionTitleClasses}>Horario y redes sociales</h2>
            </div>
            <div>
              <label className={labelClasses}>Horario de apertura</label>
              <textarea
                value={hoursString}
                onChange={handleHoursChange}
                className={inputClasses}
                rows={4}
              ></textarea>
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
