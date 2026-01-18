import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useCatalog } from "../../hooks/useCatalog";
import { UtensilsCrossed, Info, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const Footer: React.FC = () => {
  const { businessInfo } = useCatalog();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!businessInfo) return null;

  // Definimos los items con iconos de Lucide
  const navItems = [
    { 
      path: "/", 
      label: "Menú", 
      icon: <UtensilsCrossed size={22} /> 
    },
    { 
      path: "/info", 
      label: "Info", 
      icon: <Info size={22} /> 
    },
  ];

  // Si está logueado, añadimos acceso rápido al panel
  if (isAuthenticated) {
    navItems.push({
      path: "/admin",
      label: "Admin",
      icon: <LayoutDashboard size={22} />
    });
  }

  return (
    <footer className="sticky bottom-0 w-full z-50">
      {/* Efecto de degradado para que el contenido de arriba no choque bruscamente */}
      <div className="h-6 bg-gradient-to-t from-zinc-950 to-transparent"></div>
      
      <div className="bg-zinc-950/80 backdrop-blur-lg border-t border-white/10 pb-safe">
        <div className="container mx-auto max-w-md px-6">
          <div className="flex justify-around items-center py-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex flex-col items-center gap-1.5 transition-all duration-300 ${
                    isActive 
                      ? "text-yellow-500 scale-110" 
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {/* Indicador brillante superior para el item activo */}
                  {isActive && (
                    <span className="absolute -top-3 w-8 h-1 bg-yellow-500 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.5)]" />
                  )}

                  <div className={`p-1 rounded-xl transition-colors ${isActive ? "bg-yellow-500/10" : ""}`}>
                    {item.icon}
                  </div>
                  
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${
                    isActive ? "opacity-100" : "opacity-60"
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;