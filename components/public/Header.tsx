import React from "react";
import { Link } from "react-router-dom";
import { useCatalog } from "../../hooks/useCatalog";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../contexts/CartContext";
import { ShoppingCart, User, Settings, Info } from "lucide-react";

const Header: React.FC = () => {
  const { businessInfo } = useCatalog();
  const { isAuthenticated } = useAuth();
  const { cartItemsCount, openCheckout } = useCart();

  if (!businessInfo) {
    return (
      <div className="relative w-full h-56 bg-zinc-900 animate-pulse rounded-b-3xl"></div>
    );
  }

  const { banner } = businessInfo;

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5277";
  const bannerSrc = banner.imageUrl
    ? `${API_URL}${banner.imageUrl}`
    : "/images/banner2.webp";

  return (
    <header className="relative w-full flex justify-center bg-zinc-950">
      <div className="relative w-full max-w-4xl h-56 md:h-64 overflow-hidden shadow-2xl">

        {/* IMAGEN DE FONDO (BANNER) */}
        <img
          src={bannerSrc}
          alt="Banner"
          className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
          onError={(e) => {
            // Fallback a imagen local si la URL de la BD falla
            e.currentTarget.src = "/images/banner2.webp";
          }}
        />

        {/* OVERLAY GRADIENTE PROFESIONAL */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/40 to-transparent flex flex-col items-center justify-center text-center p-6">
          <h1 className="text-white text-3xl md:text-4xl font-black uppercase tracking-tighter drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {banner.title || businessInfo.name}
          </h1>
          <div className="h-1 w-12 bg-yellow-500 my-2 rounded-full"></div>
          <p className="text-gray-200 text-sm md:text-base font-medium max-w-xs md:max-w-md drop-shadow-md italic">
            {banner.subtitle}
          </p>
        </div>

        {/* BOTONES SUPERIORES IZQUIERDA (Info) */}
        <div className="absolute top-4 left-4">
          <Link
            to="/info"
            className="flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/10 text-white p-2 px-3 rounded-full hover:bg-white/20 transition-all"
          >
            <Info size={18} />
            <span className="text-xs font-bold uppercase tracking-wider hidden md:block">Info</span>
          </Link>
        </div>

        {/* BOTONES SUPERIORES DERECHA (Carrito y Admin) */}
        <div className="absolute top-4 right-4 flex gap-3">
          
          {/* Botón Carrito */}
          <button
            onClick={openCheckout}
            className="relative bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full text-white hover:bg-yellow-500 hover:text-black transition-all duration-300 shadow-xl group"
          >
            <ShoppingCart size={22} className="group-hover:scale-110 transition-transform" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-zinc-950 animate-bounce">
                {cartItemsCount}
              </span>
            )}
          </button>

          {/* Botón Admin/Login */}
          <Link
            to={isAuthenticated ? "/admin" : "/login"}
            className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full text-white hover:bg-white/30 transition-all duration-300 shadow-xl"
          >
            {isAuthenticated ? (
              <Settings size={22} />
            ) : (
              <User size={22} />
            )}
          </Link>

        </div>
      </div>
    </header>
  );
};

export default Header;