import React from "react";
import { useNavigate } from "react-router-dom";
import { useCatalog } from "../../hooks/useCatalog";
import Footer from "./Footer";

const InfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { businessInfo } = useCatalog();

  if (!businessInfo) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <p className="text-white">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-black border-b border-gray-800 z-10 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-white hover:text-gray-300"
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
          <h1 className="text-white font-bold text-xl">{businessInfo.name}</h1>
          <button className="text-white">
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
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Imagen y rating */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🍔</span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">
            {businessInfo.name}
          </h2>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl font-bold text-white">5.0</span>
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Todas incluyen papas fritas caseras
          </p>
        </div>

        {/* Contacto */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <button className="w-full flex items-center gap-3 text-left">
            <div className="bg-green-500 p-2 rounded-full">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">WhatsApp</p>
            </div>
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <button className="w-full flex items-center gap-3 text-left">
            <div className="bg-pink-500 p-2 rounded-full">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">@burgers</p>
            </div>
          </button>
        </div>

        {/* Medios de pago */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <h3 className="text-white font-semibold">Medios de pago</h3>
          </div>
          <div className="space-y-2 text-gray-300">
            <p>Efectivo</p>
            <p>Transferencia</p>
            <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
              <p className="text-sm">Alias: ******</p>
              <button className="text-primary">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Horarios */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-white font-semibold">Horarios</h3>
            </div>
            <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
              Abierto
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Lunes</span>
              <span className="text-white">Cerrado</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Martes</span>
              <span className="text-white">De 19:30 a 23:30 hs.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Miércoles</span>
              <span className="text-white">De 19:30 a 23:30 hs.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Jueves</span>
              <span className="text-white">De 19:30 a 23:30 hs.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Viernes</span>
              <span className="text-white">De 19:30 a 23:30 hs.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sábado</span>
              <span className="text-white">De 19:30 a 23:30 hs.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Domingo</span>
              <span className="text-white">De 19:30 a 23:30 hs.</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default InfoPage;
