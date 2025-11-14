import React from "react";
import { Link } from "react-router-dom";
import { useCatalog } from "../../hooks/useCatalog";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../contexts/CartContext";
import { getFullApiUrl } from "../../services/api/apiClient";

const Header: React.FC = () => {
  const { businessInfo } = useCatalog();
  const { isAuthenticated } = useAuth();
  const { cartItemsCount, openCheckout } = useCart();

  // Mientras carga la información, no mostrar nada o un esqueleto de carga
  if (!businessInfo) {
    return (
      <div className="relative w-full h-64 md:h-80 lg:h-96 bg-gray-200 animate-pulse"></div>
    );
  }

  const { banner } = businessInfo;

  return (
    <header className="relative w-full flex justify-center bg-black">
      <div className="relative w-full max-w-2xl h-48 md:h-56">
        <img
          src={getFullApiUrl(banner.imageUrl)}
          alt="Banner"
          className="w-full h-full object-cover rounded-b-2xl"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center text-center p-4 rounded-b-2xl">
          <h1 className="text-white text-2xl md:text-3xl font-bold drop-shadow-lg">
            {banner.title}
          </h1>
          <p className="text-white text-sm md:text-base mt-1 drop-shadow-md">
            {banner.subtitle}
          </p>
        </div>

        {/* Botones superiores */}
        <div className="absolute top-4 right-4 flex gap-2">
        {/* Botón del carrito */}
        <button
          onClick={openCheckout}
          className="relative bg-white bg-opacity-90 hover:bg-opacity-100 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="Ver carrito"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-800"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {cartItemsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {cartItemsCount}
            </span>
          )}
        </button>

        {/* Botón de Login/Admin */}
        <Link
          to={isAuthenticated ? "/admin" : "/login"}
          className="bg-white bg-opacity-90 hover:bg-opacity-100 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title={isAuthenticated ? "Panel Admin" : "Iniciar Sesión"}
        >
        {isAuthenticated ? (
          // Ícono de configuración/admin cuando está logueado
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-800"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ) : (
          // Ícono de usuario cuando no está logueado
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-800"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        )}
        </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
