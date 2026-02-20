import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCatalog } from "../../hooks/useCatalog";
import {
  ChevronLeft,
  MapPin,
  Clock,
  CreditCard,
  Copy,
  Check,
  Instagram,
  Phone,
} from "lucide-react"; // Asegúrate de tener lucide-react instalado
import Footer from "./Footer";

const InfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { businessInfo } = useCatalog();
  const [copied, setCopied] = useState(false);

  const handleCopyAlias = () => {
    if (businessInfo?.contact.transferAlias) {
      navigator.clipboard.writeText(businessInfo.contact.transferAlias);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5277";

  if (!businessInfo) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  const bannerSrc = businessInfo.banner?.imageUrl
    ? `${API_URL}${businessInfo.banner.imageUrl}`
    : "/images/banneroperon.png";

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* --- HERO SECTION --- */}

      {/* --- HERO SECTION CORREGIDO --- */}
       <div className="relative w-full h-72 md:h-96 bg-secondary/80 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        {/* Imagen de fondo con fallback */}
        <div className="absolute inset-0">
          <img
            src={bannerSrc}
            alt="Banner del negocio"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              // Si la imagen falla, pone una genérica automáticamente
              e.currentTarget.src = "/images/banneroperon.png";
            }}
          />
          {/* Overlay oscuro mejorado para leer el texto */}
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/80 via-secondary/40 to-secondary/80" />
        </div>

        {/* Botón Volver con mejor zona táctil */}
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 p-2 bg-secondary/60 backdrop-blur-md rounded-full text-white hover:bg-secondary/80 transition-all z-20 border border-white/10"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Info Principal sobre el banner */}
        <div className="absolute bottom-0 left-0 w-full p-6 text-center z-10 flex flex-col items-center">
          <div className="w-24 h-24 bg-secondary border-4 border-background rounded-full shadow-2xl mb-3 overflow-hidden flex items-center justify-center">
            <img
              src="/images/operon2.webp"
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-md">
            {businessInfo.name}
          </h1>

          {businessInfo.description && (
            <p className="text-gray-200 text-sm md:text-base max-w-md mx-auto line-clamp-2 mt-2 drop-shadow-sm font-medium">
              {businessInfo.description}
            </p>
          )}
        </div>
      </div>
      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="flex-1 container mx-auto px-4 py-8 max-w-lg space-y-6">
        {/* Estado Abierto/Cerrado (Opcional: lógica simple) */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Abierto ahora
          </span>
        </div>

        {/* Botones de Acción Rápida (Redes) */}
        <div className="grid grid-cols-2 gap-3">
          {businessInfo.contact.social.instagram && (
            <a
              href={businessInfo.contact.social.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-secondary/70 hover:bg-secondary/90 rounded-xl border border-white/10 transition-colors text-white"
            >
              <Instagram size={20} className="text-pink-500" />
              <span className="font-medium">Instagram</span>
            </a>
          )}
          {/* WhatsApp Button (asumiendo que phone es para WhatsApp) */}
          <a
            href={`https://wa.me/${businessInfo.contact.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-secondary/70 hover:bg-secondary/90 rounded-xl border border-white/10 transition-colors text-white"
          >
            <Phone size={20} className="text-green-500" />
            <span className="font-medium">WhatsApp</span>
          </a>
        </div>

        {/* Tarjeta: Ubicación */}
        <div className="bg-secondary/40 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <MapPin className="text-blue-500" size={24} />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Ubicación</h3>
              <p className="text-gray-400 text-sm mb-3">
                {businessInfo.contact.address}
              </p>
              <a
                href={`https://maps.google.com/?q=${businessInfo.contact.address}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 text-sm font-medium hover:underline"
              >
                Ver en Google Maps
              </a>
            </div>
          </div>
        </div>

        {/* Tarjeta: Horarios */}
        <div className="bg-secondary/40 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <Clock className="text-orange-500" size={24} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Horarios de Atención</h3>
              <p className="text-gray-500 text-xs mt-1">
                Nuestros turnos de delivery y take-away
              </p>
            </div>
          </div>
          <div className="space-y-2 pl-2 border-l-2 border-zinc-800 ml-4">
            {businessInfo.hours && businessInfo.hours.length > 0 ? (
              businessInfo.hours.map((hour, idx) => (
                <p key={idx} className="text-gray-300 text-sm pl-4 py-1">
                  {hour}
                </p>
              ))
            ) : (
              <p className="text-gray-500 pl-4">Consultar disponibilidad</p>
            )}
          </div>
        </div>

        {/* Tarjeta: Pagos */}
        <div className="bg-secondary/40 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <CreditCard className="text-purple-500" size={24} />
            </div>
            <h3 className="text-white font-semibold">Medios de Pago</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Efectivo (10% de descuento)
            </div>
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Transferencia Bancaria / Billeteras Virtuales
            </div>

            {businessInfo.contact.transferAlias && (
              <div
                className="mt-4 p-3  rounded-xl border border-white/10 flex items-center justify-between group cursor-pointer hover:border-white/20 transition-colors"
                onClick={handleCopyAlias}
              >
                <div className="overflow-hidden">
                  <p className="text-xs text-gray-500 mb-0.5">Alias CBU</p>
                  <p className="text-white font-mono text-sm truncate pr-2">
                    {businessInfo.contact.transferAlias}
                  </p>
                </div>
                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                  {copied ? (
                    <Check size={18} className="text-green-500" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default InfoPage;
